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
    // Bắt lỗi để tránh unhandled promise rejection crash toàn bộ backend
    this.predictionService.predictFutureMoisture()
      .catch(err => this.logger.error('Prediction failed (non-fatal): ' + err.message));

    // Check against active Growth Stage for warnings
    try {
      const activeStage = await this.prisma.growthStage.findFirst({
        where: { isActive: true },
      });
      if (activeStage) {
        await this.evaluateGrowthStageWarnings(data, activeStage, soilMoisture);
      }
    } catch (e) {
      this.logger.error('Error evaluating growth stage warnings: ' + e.message);
    }

    return record;
  }

  private async evaluateGrowthStageWarnings(data: CreateSensorDataDto, stage: any, soilMoisture: number) {
    let shouldTurnOnPump = false;
    let blockPumpDueToWeather = false;
    let forceOffDueToHighMoisture = false;

    // --- SMART ADVICE: KIỂM TRA DỰ BÁO THỜI TIẾT ---
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    try {
      // Lấy dự báo thời tiết gần nhất cho 24h tới
      const forecast = await this.prisma.weatherData.findFirst({
        where: {
          isForecast: true,
          date: {
            gte: now,
            lte: tomorrow,
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (forecast) {
        // Cảnh báo 1: Dự báo mưa to
        if (forecast.rainProbability > 70 || forecast.rainVolume > 10) {
          this.logger.warn(`[SMART ADVICE] Chiều/tối nay dự báo có mưa to (Xác suất: ${forecast.rainProbability}%, Lượng mưa: ${forecast.rainVolume}mm). Hệ thống tự động chặn bơm tưới để tránh ngập úng gốc cây.`);
          blockPumpDueToWeather = true;
        }
        
        // Cảnh báo 2: Nắng gắt, oi nóng
        if (forecast.avgTemp > 35 && forecast.rainProbability < 20) {
          this.logger.warn(`[SMART ADVICE] Hôm nay trời nắng gắt và rất oi nóng (Nhiệt độ dự báo: ${forecast.avgTemp}°C). Bà con nên có phương án tưới bù nước sớm để cây tránh mất nước.`);
        }
      }
    } catch (err) {
      this.logger.error('Lỗi truy vấn dữ liệu thời tiết: ' + err.message);
    }
    // ------------------------------------------------

    // --- KIỂM TRA NGƯỠNG NHIỆT ĐỘ ---
    if (stage.tempMin !== null && data.temp < stage.tempMin) {
      this.logger.warn(`[CẢNH BÁO] Nhiệt độ (${data.temp}°C) quá thấp. Ngưỡng cho phép: >= ${stage.tempMin}°C (${stage.name})`);
    }
    if (stage.tempMax !== null && data.temp > stage.tempMax) {
      this.logger.warn(`[CẢNH BÁO] Nhiệt độ (${data.temp}°C) quá cao. Ngưỡng cho phép: <= ${stage.tempMax}°C (${stage.name})`);
      shouldTurnOnPump = true;
    }

    // --- KIỂM TRA NGƯỠNG ĐỘ ẨM ĐẤT ---
    if (stage.moistureMin !== null && soilMoisture < stage.moistureMin) {
      this.logger.warn(`[CẢNH BÁO] Độ ẩm đất (${soilMoisture.toFixed(1)}%) dưới mức yêu cầu. Ngưỡng: >= ${stage.moistureMin}% (${stage.name})`);
      shouldTurnOnPump = true;
    }
    if (stage.moistureMax !== null && soilMoisture > stage.moistureMax) {
      this.logger.warn(`[CẢNH BÁO] Độ ẩm đất (${soilMoisture.toFixed(1)}%) quá cao. Ngưỡng: <= ${stage.moistureMax}% (${stage.name}). Tắt bơm để tránh ngập úng.`);
      forceOffDueToHighMoisture = true;
    }

    // --- KIỂM TRA NGƯỠNG ÁNH SÁNG ---
    if (stage.lightMin !== null && data.lux < stage.lightMin) {
      this.logger.warn(`[CẢNH BÁO] Cường độ sáng (${data.lux} lux) thấp. Cần >= ${stage.lightMin} lux (${stage.name})`);
    }
    if (stage.lightMax !== null && data.lux > stage.lightMax) {
      this.logger.warn(`[CẢNH BÁO] Cường độ sáng (${data.lux} lux) cao. Cần <= ${stage.lightMax} lux (${stage.name})`);
    }

    // --- ƯU TIÊN XỬ LÝ BƠM ---
    // Ưu tiên 1 (Cao nhất): Đất quá ướt → LUÔN TẮT BƠM, bất kể nhiệt độ hay điều kiện khác
    if (forceOffDueToHighMoisture) {
      this.logger.log(`[OVERRIDE] Đất quá ướt (${soilMoisture.toFixed(1)}% > ${stage.moistureMax}%). Tắt bơm để tránh ngập úng gốc cây.`);
      shouldTurnOnPump = false;
    }
    // Ưu tiên 2: Dự báo mưa to → chặn bơm (trừ trường hợp khẩn cấp đất quá khô)
    else if (blockPumpDueToWeather && soilMoisture > 15) {
      this.logger.log(`[OVERRIDE] Bơm bị vô hiệu hóa vì dự báo có mưa, dù các chỉ số khác có thể yêu cầu bật bơm.`);
      shouldTurnOnPump = false;
    } else if (blockPumpDueToWeather && soilMoisture <= 15) {
      // Cơ chế an toàn (Fail-safe): Đất đã QUÁ KHÔ (<15%), không thể chờ mưa được nữa
      this.logger.warn(`[EMERGENCY] Độ ẩm đất QUÁ THẤP (${soilMoisture.toFixed(1)}%), bỏ qua dự báo thời tiết và tiến hành bật bơm khẩn cấp cứu cây!`);
      shouldTurnOnPump = true;
    }
    // Ưu tiên 3: Nhiệt độ quá cao hoặc đất quá khô → bật bơm (đã set ở trên)

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
