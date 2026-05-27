import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { SensorModule } from './sensor/sensor.module';
import { WeatherModule } from './weather/weather.module';
import { PredictionModule } from './prediction/prediction.module';
import { GrowthStageModule } from './growth-stage/growth-stage.module';
import { PumpModule } from './pump/pump.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    SensorModule,
    WeatherModule,
    PredictionModule,
    GrowthStageModule,
    PumpModule,
  ],
})
export class AppModule {}
