import { PrismaService } from '../prisma/prisma.service';
import { PredictionService } from '../prediction/prediction.service';
import { PumpService } from '../pump/pump.service';
export interface CreateSensorDataDto {
    time: string;
    temp: number;
    hum: number;
    lux: number;
    light_detect: boolean;
    soil: number;
    pres?: number;
}
export declare class SensorService {
    private prisma;
    private predictionService;
    private pumpService;
    private readonly logger;
    constructor(prisma: PrismaService, predictionService: PredictionService, pumpService: PumpService);
    recordData(data: CreateSensorDataDto, deviceId?: string): Promise<{
        id: string;
        deviceId: string;
        soilMoisture: number;
        airHumidity: number;
        airTemperature: number;
        lightIntensity: number;
        lightDetect: boolean;
        airPressure: number | null;
        timestamp: Date;
    }>;
    private evaluateGrowthStageWarnings;
    getLatestReadings(limit?: number): Promise<{
        id: string;
        deviceId: string;
        soilMoisture: number;
        airHumidity: number;
        airTemperature: number;
        lightIntensity: number;
        lightDetect: boolean;
        airPressure: number | null;
        timestamp: Date;
    }[]>;
    getRecentHistory(hoursString?: string): Promise<{
        id: string;
        deviceId: string;
        soilMoisture: number;
        airHumidity: number;
        airTemperature: number;
        lightIntensity: number;
        lightDetect: boolean;
        airPressure: number | null;
        timestamp: Date;
    }[]>;
}
