import { Module } from '@nestjs/common';
import { GrowthStageService } from './growth-stage.service';
import { GrowthStageController } from './growth-stage.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GrowthStageController],
  providers: [GrowthStageService],
  exports: [GrowthStageService]
})
export class GrowthStageModule {}
