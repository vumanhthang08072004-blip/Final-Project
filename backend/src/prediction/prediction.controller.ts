import { Controller, Get } from '@nestjs/common';
import { PredictionService } from './prediction.service';

@Controller('api/prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get('latest')
  async getLatestPredictions() {
    return this.predictionService.getPredictions();
  }

  @Get('trigger')
  async triggerAlgorithm() {
    await this.predictionService.predictFutureMoisture();
    return { success: true, message: 'Prediction heuristic triggered successfully' };
  }
}
