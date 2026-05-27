import { Controller, Get, Put, Body } from '@nestjs/common';
import { PumpService } from './pump.service';

@Controller('api/pump')
export class PumpController {
  constructor(private readonly pumpService: PumpService) {}

  @Get('state')
  async getState() {
    return this.pumpService.getPumpState();
  }

  @Put('mode')
  async toggleMode(@Body('isAuto') isAuto: boolean) {
    return this.pumpService.setMode(isAuto);
  }

  @Put('toggle')
  async togglePump(@Body('isOn') isOn: boolean) {
    return this.pumpService.manualToggle(isOn);
  }
}
