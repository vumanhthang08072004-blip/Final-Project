import { Controller, Get, Query } from '@nestjs/common';
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

  /**
   * Temporary cleanup endpoint — xóa predictions và sensor data trước ngày chỉ định.
   * Usage: GET /api/prediction/cleanup?before=2026-07-05
   */
  @Get('cleanup')
  async cleanup(@Query('before') before: string) {
    if (!before) {
      return { error: 'Missing "before" query parameter. Usage: /api/prediction/cleanup?before=2026-07-05' };
    }
    const result = await this.predictionService.cleanupOldData(new Date(before));
    return { success: true, ...result };
  }
}
