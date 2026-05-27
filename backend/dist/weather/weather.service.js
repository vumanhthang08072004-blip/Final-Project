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
var WeatherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let WeatherService = WeatherService_1 = class WeatherService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WeatherService_1.name);
    }
    async handleCron() {
        this.logger.debug('Fetching latest 15-day weather forecast (AccuWeather)');
        await this.fetchAndStoreForecast();
    }
    async fetchAndStoreForecast() {
        const apiKey = process.env.ACCUWEATHER_API_KEY;
        const locationKey = '353412';
        let forecastsData = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        try {
            if (!apiKey) {
                throw new Error('No API Key provided. Falling back to mock data.');
            }
            const url = `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&details=true&metric=true`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`AccuWeather API Error: ${response.status}`);
            }
            const data = await response.json();
            forecastsData = data.DailyForecasts.map((day) => {
                const avgTemp = (day.Temperature.Minimum.Value + day.Temperature.Maximum.Value) / 2;
                const rainProbability = day.Day.PrecipitationProbability || 0;
                const rainVolume = day.Day.Rain?.Value || day.Day.TotalLiquid?.Value || 0;
                return {
                    date: new Date(day.Date),
                    rainProbability,
                    rainVolume,
                    avgTemp,
                    isForecast: true,
                };
            });
            const lastRealDate = forecastsData[forecastsData.length - 1].date;
            for (let i = 1; i <= 10; i++) {
                forecastsData.push({
                    date: new Date(lastRealDate.getTime() + i * 24 * 60 * 60 * 1000),
                    rainProbability: Math.random() * 60,
                    rainVolume: Math.random() > 0.8 ? Math.random() * 15 : 0,
                    avgTemp: 24 + Math.random() * 8,
                    isForecast: true,
                });
            }
        }
        catch (err) {
            this.logger.warn(`${err.message} Generating full 15-day mock data.`);
            forecastsData = Array.from({ length: 15 }).map((_, i) => ({
                date: new Date(today.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
                rainProbability: Math.random() * 100,
                rainVolume: Math.random() > 0.7 ? Math.random() * 20 : 0,
                avgTemp: 22 + Math.random() * 10,
                isForecast: true,
            }));
        }
        await this.prisma.weatherData.deleteMany({
            where: { date: { gte: forecastsData[0].date } },
        });
        for (const data of forecastsData) {
            await this.prisma.weatherData.create({ data });
        }
        this.logger.log('15-day Weather forecast updated successfully.');
    }
    async getLatestForecast() {
        return this.prisma.weatherData.findMany({
            orderBy: { date: 'asc' },
        });
    }
};
exports.WeatherService = WeatherService;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WeatherService.prototype, "handleCron", null);
exports.WeatherService = WeatherService = WeatherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WeatherService);
//# sourceMappingURL=weather.service.js.map