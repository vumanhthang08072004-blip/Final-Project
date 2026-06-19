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
   * 1. Fetch 20 most recent sensor readings from DB
   * 2. Send them as timesteps to the Python ML service POST /predict
   * 3. Save the predicted value into the Predictions table
   */
  @Cron(CronExpression.EVERY_HOUR)
  async predictFutureMoisture() {
    this.logger.debug('Running LSTM-based soil moisture prediction');

    // 1. Get the 20 most recent sensor readings (TIME_STEPS = 20)
    const sensors = await this.prisma.sensorData.findMany({
      orderBy: { timestamp: 'desc' },
      take: LSTM_TIME_STEPS,
    });

    if (sensors.length < LSTM_TIME_STEPS) {
      this.logger.warn(
        `Need at least ${LSTM_TIME_STEPS} sensor readings for LSTM prediction, only have ${sensors.length}. Skipping.`,
      );
      return;
    }

    // Reverse to chronological order (oldest → newest)
    sensors.reverse();

    // 2. Build timesteps array for the LSTM ML service
    //    Features: [temp, humd, soil, lum] — khớp thứ tự khi training
    const timesteps = sensors.map((s) => ({
      temp: s.airTemperature,
      humd: s.airHumidity,
      soil: s.soilMoisture,
      lum: s.lightIntensity,
    }));

    try {
      // 3. Call Python FastAPI ML service
      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/predict`, {
          timesteps,
        }),
      );

      const predictedMoisture = response.data.predicted_soil_moisture;
      this.logger.log(`LSTM predicted soil moisture: ${predictedMoisture}%`);

      // 4. Save prediction for the next hour
      const forecastDate = new Date();
      forecastDate.setHours(forecastDate.getHours() + 1);
      forecastDate.setMinutes(0, 0, 0);

      // Also generate multi-step predictions by rolling the window forward
      // For single-step model, we iteratively predict and shift the window
      await this.generateMultiStepPredictions(sensors, timesteps, predictedMoisture);

    } catch (error) {
      this.logger.error(`LSTM prediction failed: ${error.message}`);
      this.logger.warn('Falling back to heuristic prediction');
      await this.fallbackHeuristicPrediction();
    }
  }

  /**
   * Generate multi-step predictions by iteratively feeding predictions back
   * into the model. This gives us a forecast for multiple future timesteps.
   */
  private async generateMultiStepPredictions(
    sensors: any[],
    initialTimesteps: any[],
    firstPrediction: number,
  ) {
    const predictions = [];
    let currentTimesteps = [...initialTimesteps];
    let lastPredicted = firstPrediction;

    // Get weather forecast data for future temperature/humidity estimates
    const forecasts = await this.prisma.weatherData.findMany({
      where: { isForecast: true },
      orderBy: { date: 'asc' },
    });

    const numSteps = Math.min(forecasts.length, 15); // Up to 15 days

    for (let i = 0; i < numSteps; i++) {
      const forecast = forecasts[i];

      // Use forecast weather data combined with last prediction for next step
      const nextTimestep = {
        temp: forecast.avgTemp,
        humd: currentTimesteps[currentTimesteps.length - 1].humd, // carry forward
        soil: lastPredicted, // Đưa kết quả dự đoán trước đó làm input cho bước tiếp
        lum: currentTimesteps[currentTimesteps.length - 1].lum,   // carry forward
      };

      // Slide the window: drop oldest, add new
      currentTimesteps = [...currentTimesteps.slice(1), nextTimestep];

      // Call ML service for next prediction
      try {
        const response = await firstValueFrom(
          this.httpService.post(`${this.mlServiceUrl}/predict`, {
            timesteps: currentTimesteps,
          }),
        );
        lastPredicted = response.data.predicted_soil_moisture;
      } catch {
        // If ML service fails mid-loop, use the last known prediction
        this.logger.warn(`ML service call failed at step ${i + 1}, using last value`);
      }

      // Confidence drops as we predict further into the future
      const confidenceScore = Math.max(0.3, 1.0 - i * 0.05);

      predictions.push({
        forecastDate: forecast.date,
        predictedValue: Number(lastPredicted.toFixed(2)),
        confidenceScore: Number(confidenceScore.toFixed(2)),
      });
    }

    // Replace old predictions with new LSTM-based ones
    await this.prisma.predictions.deleteMany();

    for (const pred of predictions) {
      await this.prisma.predictions.create({ data: pred });
    }

    this.logger.log(
      `Generated ${predictions.length} days of LSTM soil moisture predictions.`,
    );
  }

  /**
   * Fallback to the original heuristic prediction when ML service is unavailable.
   */
  private async fallbackHeuristicPrediction() {
    this.logger.debug('Running fallback Loamy Soil moisture prediction heuristic');

    const sensors = await this.prisma.sensorData.findMany({
      orderBy: { timestamp: 'desc' },
      take: 1,
    });

    if (!sensors.length) {
      this.logger.warn('No sensor data available for prediction');
      return;
    }

    const currentSoilMoisture = sensors[0].soilMoisture;

    const forecasts = await this.prisma.weatherData.findMany({
      where: { isForecast: true },
      orderBy: { date: 'asc' },
    });

    if (!forecasts.length) {
      this.logger.warn('No weather forecast available to calculate trend');
      return;
    }

    const predictions = [];
    let simulatedMoisture = currentSoilMoisture;

    // Coefficients specific for Loamy Soil (Đất thịt Nhật Tân)
    const k1 = 0.5; // Evaporation factor based on temperature
    const k2 = 2.5; // Rain absorption factor

    for (let i = 0; i < forecasts.length; i++) {
      const forecast = forecasts[i];
      const evaporation = k1 * forecast.avgTemp;
      const rainGained = k2 * forecast.rainVolume;
      const dailyChange = rainGained - evaporation;

      simulatedMoisture = simulatedMoisture + dailyChange;
      simulatedMoisture = Math.max(0, Math.min(100, simulatedMoisture));

      const confidenceScore = Math.max(0.3, 1.0 - i * 0.05);

      predictions.push({
        forecastDate: forecast.date,
        predictedValue: Number(simulatedMoisture.toFixed(2)),
        confidenceScore: Number(confidenceScore.toFixed(2)),
      });
    }

    await this.prisma.predictions.deleteMany();
    for (const pred of predictions) {
      await this.prisma.predictions.create({ data: pred });
    }

    this.logger.log(
      `[Fallback] Generated ${predictions.length} days of heuristic soil moisture prediction.`,
    );
  }

  async getPredictions() {
    return this.prisma.predictions.findMany({
      orderBy: { forecastDate: 'asc' },
    });
  }
}
