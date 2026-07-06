import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

/**
 * Number of timesteps required by the LSTM model.
 * Must match TIME_STEPS in ml-service/main.py
 */
const LSTM_TIME_STEPS = 20;

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Predict soil moisture using the LSTM model served by the FastAPI ML service.
   * 
   * Flow:
   * 1. Fetch 160 most recent sensor records.
   * 2. Down-sample to hourly intervals by selecting every 4th index (index % 4 === 0).
   * 3. Sort chronologically (oldest to newest).
   * 4. For indices 20..39: perform past predictions using window of size 20.
   * 5. Generate rolling forecast for the next 15 hourly steps (15 hours).
   * 6. Save all predictions (both past overlap and future forecast) to DB.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async predictFutureMoisture() {
    this.logger.debug('Running LSTM-based soil moisture prediction (Hourly Overlap)');

    // 0. Verify if ML Service is online before executing (with retry to wake up Render free tier)
    let isHealthy = false;
    const maxRetries = 6;
    const delayMs = 10000; // 10 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await firstValueFrom(this.httpService.get(`${this.mlServiceUrl}/health`));
        isHealthy = true;
        this.logger.log(`ML Service is online and healthy (Attempt ${attempt})`);
        break;
      } catch (err) {
        this.logger.warn(
          `ML Service health check failed on attempt ${attempt}/${maxRetries}. Service might be waking up. Retrying in ${delayMs / 1000}s...`
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!isHealthy) {
      this.logger.error(`ML Service at ${this.mlServiceUrl} failed to respond after ${maxRetries} attempts. Aborting prediction (non-fatal).`);
      return; // Thoát an toàn thay vì throw crash backend
    }

    // 1. Get 160 raw sensor readings (~40 hours of 15-minute interval data)
    const rawSensors = await this.prisma.sensorData.findMany({
      orderBy: { timestamp: 'desc' },
      take: 160,
    });

    // Filter to get 1-hour intervals (each 4th reading)
    const sensors = rawSensors.filter((_, idx) => idx % 4 === 0);

    if (sensors.length < LSTM_TIME_STEPS) {
      this.logger.warn(
        `Need at least ${LSTM_TIME_STEPS} hourly sensor readings for LSTM prediction, only have ${sensors.length}. Skipping.`,
      );
      return;
    }

    // Reverse to chronological order (oldest → newest)
    sensors.reverse();

    const predictions = [];

    // 2. Generate comparison predictions for the past hourly timesteps (starting from index 20)
    for (let i = LSTM_TIME_STEPS; i < sensors.length; i++) {
      const windowSensors = sensors.slice(i - LSTM_TIME_STEPS, i);
      const timesteps = windowSensors.map((s) => ({
        temp: s.airTemperature,
        humd: s.airHumidity,
        soil: s.soilMoisture,
        lum: s.lightIntensity,
      }));

      try {
        const response = await firstValueFrom(
          this.httpService.post(`${this.mlServiceUrl}/predict`, {
            timesteps,
          }),
        );
        const val = response.data.predicted_soil_moisture;
        const forecastDate = new Date(sensors[i].timestamp);
        forecastDate.setMinutes(0, 0, 0);
        predictions.push({
          forecastDate,
          predictedValue: Number(val.toFixed(2)),
          confidenceScore: 1.0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to generate past prediction at index ${i}: ${message}`);
        return; // Thoát an toàn thay vì throw crash backend
      }
    }

    // 3. Generate future forecast for the next 15 hours
    const latestSensorTime = new Date(sensors[sensors.length - 1].timestamp);
    latestSensorTime.setMinutes(0, 0, 0);
    const last20Sensors = sensors.slice(sensors.length - LSTM_TIME_STEPS);
    let currentTimesteps = last20Sensors.map((s) => ({
      temp: s.airTemperature,
      humd: s.airHumidity,
      soil: s.soilMoisture,
      lum: s.lightIntensity,
    }));

    let lastPredicted = predictions.length > 0 
      ? predictions[predictions.length - 1].predictedValue 
      : sensors[sensors.length - 1].soilMoisture;

    const numSteps = 15; // Forecast the next 15 hours

    for (let i = 0; i < numSteps; i++) {
      // Each step in future is +1 hour
      const forecastDate = new Date(latestSensorTime.getTime() + (i + 1) * 60 * 60 * 1000);

      const nextTimestep = {
        temp: currentTimesteps[currentTimesteps.length - 1].temp,
        humd: currentTimesteps[currentTimesteps.length - 1].humd,
        soil: lastPredicted, // Feed back prediction
        lum: currentTimesteps[currentTimesteps.length - 1].lum,
      };

      currentTimesteps = [...currentTimesteps.slice(1), nextTimestep];

      try {
        const response = await firstValueFrom(
          this.httpService.post(`${this.mlServiceUrl}/predict`, {
            timesteps: currentTimesteps,
          }),
        );
        lastPredicted = response.data.predicted_soil_moisture;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`ML service call failed at future step ${i + 1}: ${message}`);
        return; // Thoát an toàn thay vì throw crash backend
      }

      // Confidence drops as we predict further into the future
      const confidenceScore = Math.max(0.3, 1.0 - i * 0.05);

      predictions.push({
        forecastDate,
        predictedValue: Number(lastPredicted.toFixed(2)),
        confidenceScore: Number(confidenceScore.toFixed(2)),
      });
    }

    // Save predictions to database, overriding the old table content
    await this.prisma.predictions.deleteMany();
    for (const pred of predictions) {
      await this.prisma.predictions.create({ data: pred });
    }

    this.logger.log(
      `Generated ${predictions.length} hourly steps of LSTM soil moisture predictions.`,
    );
  }

  async getPredictions() {
    return this.prisma.predictions.findMany({
      orderBy: { forecastDate: 'asc' },
    });
  }
}

