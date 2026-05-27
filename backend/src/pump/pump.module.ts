import { Module } from '@nestjs/common';
import { PumpService } from './pump.service';
import { PumpController } from './pump.controller';

@Module({
  controllers: [PumpController],
  providers: [PumpService],
  exports: [PumpService],
})
export class PumpModule {}
