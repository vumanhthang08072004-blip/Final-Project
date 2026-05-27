import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [PredictionController],
  providers: [PredictionService],
  exports: [PredictionService],
})
export class PredictionModule {}
