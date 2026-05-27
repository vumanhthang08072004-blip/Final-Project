import { Module } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';
import { PredictionModule } from '../prediction/prediction.module';
import { PumpModule } from '../pump/pump.module';

@Module({
  imports: [PredictionModule, PumpModule],
  controllers: [SensorController],
  providers: [SensorService],
  exports: [SensorService],
})
export class SensorModule {}
