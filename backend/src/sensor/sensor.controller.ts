import { Controller, Post, Body, Get, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SensorService, CreateSensorDataDto } from './sensor.service';

@Controller('api/sensor-data')
export class SensorController {
  private readonly logger = new Logger(SensorController.name);

  constructor(private readonly sensorService: SensorService) {}

  // 1. MQTT Handler (For ESP32 via HiveMQ)
  @MessagePattern('bkhn/thang/sensors')
  async handleMqttSensorData(@Payload() data: CreateSensorDataDto) {
    this.logger.log(`MQTT Received Payload: ${JSON.stringify(data)}`);
    return this.sensorService.recordData(data, 'ESP32_Thang_MQTT');
  }

  // 2. HTTP POST Handler (Optional, for debugging with Postman)
  @Post()
  async receiveData(@Body() data: CreateSensorDataDto) {
    return this.sensorService.recordData(data, 'ESP32_Thang_HTTP');
  }

  // 3. API reads for the Dashboard
  @Get('latest')
  async getLatest() {
    return this.sensorService.getLatestReadings(1);
  }

  @Get('history')
  async getHistory() {
    return this.sensorService.getRecentHistory('336'); // 14 days of history
  }

  @Get('cleanup-invalid')
  async cleanupInvalidData() {
    return this.sensorService.cleanupInvalidData();
  }
}
