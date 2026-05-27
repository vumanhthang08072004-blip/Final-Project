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
var PredictionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const rxjs_1 = require("rxjs");
const DEFAULT_PRESSURE_HPA = 1013.0;
let PredictionService = PredictionService_1 = class PredictionService {
    constructor(prisma, httpService) {
        this.prisma = prisma;
        this.httpService = httpService;
        this.logger = new common_1.Logger(PredictionService_1.name);
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    }
    async predictFutureMoisture() {
        this.logger.debug('Running CNN-based soil moisture prediction');
        const sensors = await this.prisma.sensorData.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10,
        });
        if (sensors.length < 10) {
            this.logger.warn(`Need at least 10 sensor readings for CNN prediction, only have ${sensors.length}. Skipping.`);
            return;
        }
        sensors.reverse();
        const timesteps = sensors.map((s) => ({
            temp: s.airTemperature,
            humd: s.airHumidity,
            lum: s.lightIntensity,
            pres: s.airPressure ?? DEFAULT_PRESSURE_HPA,
        }));
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.mlServiceUrl}/predict`, {
                timesteps,
            }));
            const predictedMoisture = response.data.predicted_soil_moisture;
            this.logger.log(`CNN predicted soil moisture: ${predictedMoisture}%`);
            const forecastDate = new Date();
            forecastDate.setHours(forecastDate.getHours() + 1);
            forecastDate.setMinutes(0, 0, 0);
            await this.generateMultiStepPredictions(sensors, timesteps, predictedMoisture);
        }
        catch (error) {
            this.logger.error(`CNN prediction failed: ${error.message}`);
            this.logger.warn('Falling back to heuristic prediction');
            await this.fallbackHeuristicPrediction();
        }
    }
    async generateMultiStepPredictions(sensors, initialTimesteps, firstPrediction) {
        const predictions = [];
        let currentTimesteps = [...initialTimesteps];
        let lastPredicted = firstPrediction;
        const forecasts = await this.prisma.weatherData.findMany({
            where: { isForecast: true },
            orderBy: { date: 'asc' },
        });
        const numSteps = Math.min(forecasts.length, 15);
        for (let i = 0; i < numSteps; i++) {
            const forecast = forecasts[i];
            const nextTimestep = {
                temp: forecast.avgTemp,
                humd: currentTimesteps[currentTimesteps.length - 1].humd,
                lum: currentTimesteps[currentTimesteps.length - 1].lum,
                pres: currentTimesteps[currentTimesteps.length - 1].pres,
            };
            currentTimesteps = [...currentTimesteps.slice(1), nextTimestep];
            try {
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.mlServiceUrl}/predict`, {
                    timesteps: currentTimesteps,
                }));
                lastPredicted = response.data.predicted_soil_moisture;
            }
            catch {
                this.logger.warn(`ML service call failed at step ${i + 1}, using last value`);
            }
            const confidenceScore = Math.max(0.3, 1.0 - i * 0.05);
            predictions.push({
                forecastDate: forecast.date,
                predictedValue: Number(lastPredicted.toFixed(2)),
                confidenceScore: Number(confidenceScore.toFixed(2)),
            });
        }
        await this.prisma.predictions.deleteMany();
        for (const pred of predictions) {
            await this.prisma.predictions.create({ data: pred });
        }
        this.logger.log(`Generated ${predictions.length} days of CNN soil moisture predictions.`);
    }
    async fallbackHeuristicPrediction() {
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
        const k1 = 0.5;
        const k2 = 2.5;
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
        this.logger.log(`[Fallback] Generated ${predictions.length} days of heuristic soil moisture prediction.`);
    }
    async getPredictions() {
        return this.prisma.predictions.findMany({
            orderBy: { forecastDate: 'asc' },
        });
    }
};
exports.PredictionService = PredictionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PredictionService.prototype, "predictFutureMoisture", null);
exports.PredictionService = PredictionService = PredictionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService])
], PredictionService);
//# sourceMappingURL=prediction.service.js.map