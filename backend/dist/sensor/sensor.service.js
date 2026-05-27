"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SensorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const prediction_service_1 = require("../prediction/prediction.service");
const pump_service_1 = require("../pump/pump.service");
let SensorService = SensorService_1 = class SensorService {
    constructor(prisma, predictionService, pumpService) {
        this.prisma = prisma;
        this.predictionService = predictionService;
        this.pumpService = pumpService;
        this.logger = new common_1.Logger(SensorService_1.name);
    }
    async recordData(data, deviceId = 'ESP32_Thang') {
        this.logger.log(`Received sensor reading from ${deviceId} at ${data.time}`);
        const timestampStr = data.time.replace(' ', 'T') + '+07:00';
        const timestamp = new Date(timestampStr);
        const record = await this.prisma.sensorData.create({
            data: {
                deviceId: deviceId,
                soilMoisture: data.soil,
                airHumidity: data.hum,
                airTemperature: data.temp,
                lightIntensity: data.lux,
                lightDetect: data.light_detect,
                airPressure: data.pres ?? null,
                timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
            },
        });
        this.predictionService.predictFutureMoisture();
        try {
            const activeStage = await this.prisma.growthStage.findFirst({
                where: { isActive: true },
            });
            if (activeStage) {
                this.evaluateGrowthStageWarnings(data, activeStage);
            }
        }
        catch (e) {
            this.logger.error('Error evaluating growth stage warnings: ' + e.message);
        }
        return record;
    }
    evaluateGrowthStageWarnings(data, stage) {
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
};
exports.SensorService = SensorService;
exports.SensorService = SensorService = SensorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        prediction_service_1.PredictionService,
        pump_service_1.PumpService])
], SensorService);
//# sourceMappingURL=sensor.service.js.map