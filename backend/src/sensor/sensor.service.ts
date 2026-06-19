import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionService } from '../prediction/prediction.service';
import { PumpService } from '../pump/pump.service';

// Match the JSON payload given by the ESP32 MQTTS firmware
export interface CreateSensorDataDto {
  device_id?: string;  // ID thiết bị ESP32 ("ESP32_Peach_Node")
  timestamp: number;   // Unix Epoch (giây) từ RTC DS3231
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
  ) { }

  /**
   * Save payload to DB from MQTT or HTTP
   * @param data JSON from ESP32
   */
  // Soil moisture sensor calibration
  // ADC 2627 → 0 % (dry)
  // ADC 884  → 100 % (wet)
  private static readonly SOIL_ADC_DRY = 2627;  // 0 %
  private static readonly SOIL_ADC_WET = 884;   // 100 %

  async recordData(data: CreateSensorDataDto, deviceId: string = 'ESP32_Peach_Node') {
    this.logger.log(`Received sensor reading from ${deviceId} at epoch=${data.timestamp}`);

    // Chuyển đổi Unix Epoch (giây) từ RTC DS3231 thành JavaScript Date
    // JS Date constructor nhận milliseconds, nên nhân 1000
    const timestamp = new Date(data.timestamp * 1000);

    // --- Soil moisture: convert raw ADC → calibrated percentage ---
    const rawSoil = data.soil;
    const soilMoistureRaw =
      ((SensorService.SOIL_ADC_DRY - rawSoil) * 100) /
      (SensorService.SOIL_ADC_DRY - SensorService.SOIL_ADC_WET);
    // Clamp to [0, 100] to prevent out-of-range values
    const soilMoisture = Math.min(100, Math.max(0, soilMoistureRaw));

    this.logger.log(
      `Soil moisture: raw ADC=${rawSoil} → ${soilMoisture.toFixed(1)}%`,
    );

    // Create DB record, mapping the payload fields to Prisma fields
    const record = await this.prisma.sensorData.create({
      data: {
        deviceId: deviceId,
        soilMoisture: soilMoisture,
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
        this.evaluateGrowthStageWarnings(data, activeStage, soilMoisture);
      }
    } catch (e) {
      this.logger.error('Error evaluating growth stage warnings: ' + e.message);
    }

    return record;
  }

  private evaluateGrowthStageWarnings(data: CreateSensorDataDto, stage: any, soilMoisture: number) {
    let shouldTurnOnPump = false;

    if (stage.tempMin !== null && data.temp < stage.tempMin) {
      this.logger.warn(`[CẢNH BÁO] Nhiệt độ (${data.temp}°C) quá thấp. Ngưỡng cho phép: >= ${stage.tempMin}°C (${stage.name})`);
    }
    if (stage.tempMax !== null && data.temp > stage.tempMax) {
      this.logger.warn(`[CẢNH BÁO] Nhiệt độ (${data.temp}°C) quá cao. Ngưỡng cho phép: <= ${stage.tempMax}°C (${stage.name})`);
      shouldTurnOnPump = true;
    }

    if (stage.moistureMin !== null && soilMoisture < stage.moistureMin) {
      this.logger.warn(`[CẢNH BÁO] Độ ẩm đất (${soilMoisture.toFixed(1)}%) dưới mức yêu cầu. Ngưỡng: >= ${stage.moistureMin}% (${stage.name})`);
      shouldTurnOnPump = true;
    }
    if (stage.moistureMax !== null && soilMoisture > stage.moistureMax) {
      this.logger.warn(`[CẢNH BÁO] Độ ẩm đất (${soilMoisture.toFixed(1)}%) qúa cao. Ngưỡng: <= ${stage.moistureMax}% (${stage.name})`);
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
