import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { PredictionService } from '../prediction/prediction.service';
import { PumpService } from '../pump/pump.service';

// Match the JSON payload given by the ESP32 code
export interface CreateSensorDataDto {
  time: string;
  temp: number;
  hum: number;
  lux: number;
  soil: number;
  pres?: number; // Atmospheric pressure (hPa) from BME280
  nitrogen?: number;   // Nồng độ N (mg/kg) từ cảm biến NPK RS485
  phosphorus?: number; // Nồng độ P (mg/kg) từ cảm biến NPK RS485
  potassium?: number;  // Nồng độ K (mg/kg) từ cảm biến NPK RS485
}

@Injectable()
export class SensorService {
  private readonly logger = new Logger(SensorService.name);

  constructor(
    private prisma: PrismaService,
    private predictionService: PredictionService,
    private pumpService: PumpService,
  ) {}

  /**
   * Save payload to DB from MQTT or HTTP
   * @param data JSON from ESP32
   */
  async recordData(data: CreateSensorDataDto, deviceId: string = 'ESP32_Thang') {
    this.logger.log(`Received sensor reading from ${deviceId} at ${data.time}`);

    // Parse the ESP time string "YYYY-MM-DD HH:MM:SS" into ISO 8601
    // Appending +07:00 assuming the ESP32 is synced to Vietnam NTP (+7)
    const timestampStr = data.time.replace(' ', 'T') + '+07:00';
    const timestamp = new Date(timestampStr);

    // Create DB record, mapping the payload fields to Prisma fields
    const record = await this.prisma.sensorData.create({
      data: {
        deviceId: deviceId,
        soilMoisture: data.soil,
        airHumidity: data.hum,
        airTemperature: data.temp,
        lightIntensity: data.lux,
        airPressure: data.pres ?? null,
        nitrogen: data.nitrogen ?? null,
        phosphorus: data.phosphorus ?? null,
        potassium: data.potassium ?? null,
        timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
      },
    });

    // Optionally trigger a real-time recalculation of the moisture prediction
    this.predictionService.predictFutureMoisture();

    // Check against active Growth Stage for warnings
    try {
      const activeStage = await this.prisma.growthStage.findFirst({
        where: { isActive: true },
      });
      if (activeStage) {
        this.evaluateGrowthStageWarnings(data, activeStage);
      }
    } catch (e) {
      this.logger.error('Error evaluating growth stage warnings: ' + e.message);
    }

    return record;
  }

  private evaluateGrowthStageWarnings(data: CreateSensorDataDto, stage: any) {
    let shouldTurnOnPump = false;

    if (stage.tempMin !== null && data.temp < stage.tempMin) {
      this.logger.warn(`[CẢNH BÁO] Nhiệt độ (${data.temp}°C) quá thấp. Ngưỡng cho phép: >= ${stage.tempMin}°C (${stage.name})`);
    }
    if (stage.tempMax !== null && data.temp > stage.tempMax) {
      this.logger.warn(`[CẢNH BÁO] Nhiệt độ (${data.temp}°C) quá cao. Ngưỡng cho phép: <= ${stage.tempMax}°C (${stage.name})`);
      shouldTurnOnPump = true;
    }

    if (stage.moistureMin !== null && data.soil < stage.moistureMin) {
      this.logger.warn(`[CẢNH BÁO] Độ ẩm đất (${data.soil}%) dưới mức yêu cầu. Ngưỡng: >= ${stage.moistureMin}% (${stage.name})`);
      shouldTurnOnPump = true;
    }
    if (stage.moistureMax !== null && data.soil > stage.moistureMax) {
      this.logger.warn(`[CẢNH BÁO] Độ ẩm đất (${data.soil}%) qúa cao. Ngưỡng: <= ${stage.moistureMax}% (${stage.name})`);
    }

    if (stage.lightMin !== null && data.lux < stage.lightMin) {
      this.logger.warn(`[CẢNH BÁO] Cường độ sáng (${data.lux} lux) thấp. Cần >= ${stage.lightMin} lux (${stage.name})`);
    }
    if (stage.lightMax !== null && data.lux > stage.lightMax) {
      this.logger.warn(`[CẢNH BÁO] Cường độ sáng (${data.lux} lux) cao. Cần <= ${stage.lightMax} lux (${stage.name})`);
    }

    // Auto-trigger pump if conditions meet
    this.pumpService.autoTriggerPump(shouldTurnOnPump)
      .catch(err => this.logger.error('Failed to trigger pump auto: ' + err.message));
  }

  async getLatestReadings(limit = 1) {
    return this.prisma.sensorData.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getRecentHistory(hoursString = '24') {
    const hours = parseInt(hoursString, 10);
    const date = new Date();
    date.setHours(date.getHours() - hours);

    return this.prisma.sensorData.findMany({
      where: { timestamp: { gte: date } },
      orderBy: { timestamp: 'asc' }, 
    });
  }
}
