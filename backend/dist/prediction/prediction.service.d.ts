import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
export declare class PredictionService {
    private prisma;
    private httpService;
    private readonly logger;
    private readonly mlServiceUrl;
    constructor(prisma: PrismaService, httpService: HttpService);
    predictFutureMoisture(): Promise<void>;
    private generateMultiStepPredictions;
    private fallbackHeuristicPrediction;
    getPredictions(): Promise<{
        id: string;
        createdAt: Date;
        forecastDate: Date;
        predictedValue: number;
        confidenceScore: number;
    }[]>;
}
