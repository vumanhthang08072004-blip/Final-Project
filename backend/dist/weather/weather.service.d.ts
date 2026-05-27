import { PrismaService } from '../prisma/prisma.service';
export declare class WeatherService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleCron(): Promise<void>;
    fetchAndStoreForecast(): Promise<void>;
    getLatestForecast(): Promise<{
        id: string;
        date: Date;
        rainProbability: number;
        rainVolume: number;
        avgTemp: number;
        isForecast: boolean;
        createdAt: Date;
    }[]>;
}
