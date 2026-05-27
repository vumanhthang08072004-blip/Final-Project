import { WeatherService } from './weather.service';
export declare class WeatherController {
    private readonly weatherService;
    constructor(weatherService: WeatherService);
    getForecast(): Promise<{
        id: string;
        date: Date;
        rainProbability: number;
        rainVolume: number;
        avgTemp: number;
        isForecast: boolean;
        createdAt: Date;
    }[]>;
    syncWeather(): Promise<{
        success: boolean;
        message: string;
    }>;
}
