import { Controller, Get } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('api/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('forecast')
  async getForecast() {
    return this.weatherService.getLatestForecast();
  }

  @Get('sync')
  async syncWeather() {
    await this.weatherService.fetchAndStoreForecast();
    return { success: true, message: '15-day weather fetched successfully' };
  }
}
