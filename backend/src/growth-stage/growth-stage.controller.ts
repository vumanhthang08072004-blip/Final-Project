import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { GrowthStageService } from './growth-stage.service';

@Controller('growth-stages')
export class GrowthStageController {
  constructor(private readonly growthStageService: GrowthStageService) {}

  @Get()
  getAll() {
    return this.growthStageService.findAll();
  }

  @Get('active')
  getActive() {
    return this.growthStageService.getActiveStage();
  }

  @Post()
  create(@Body() data: any) {
    return this.growthStageService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.growthStageService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.growthStageService.delete(id);
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.growthStageService.activateStage(id);
  }
}
