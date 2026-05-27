import { PredictionService } from './prediction.service';
export declare class PredictionController {
    private readonly predictionService;
    constructor(predictionService: PredictionService);
    getLatestPredictions(): Promise<{
        id: string;
        createdAt: Date;
        forecastDate: Date;
        predictedValue: number;
        confidenceScore: number;
    }[]>;
    triggerAlgorithm(): Promise<{
        success: boolean;
        message: string;
    }>;
}
