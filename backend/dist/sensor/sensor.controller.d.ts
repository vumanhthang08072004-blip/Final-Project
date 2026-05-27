import { SensorService, CreateSensorDataDto } from './sensor.service';
export declare class SensorController {
    private readonly sensorService;
    private readonly logger;
    constructor(sensorService: SensorService);
    handleMqttSensorData(data: CreateSensorDataDto): Promise<{
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
    receiveData(data: CreateSensorDataDto): Promise<{
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
    getLatest(): Promise<{
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
    getHistory(): Promise<{
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
