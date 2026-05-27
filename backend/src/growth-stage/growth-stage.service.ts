import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GrowthStageService implements OnModuleInit {
  private readonly logger = new Logger(GrowthStageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultStages();
  }

  async seedDefaultStages() {
    try {
      const count = await this.prisma.growthStage.count();
      if (count === 0) {
        this.logger.log('Seeding default growth stages...');
        await this.prisma.growthStage.createMany({
          data: [
            {
              name: 'Giai đoạn 1: Phục hồi và sinh trưởng',
              description: 'Tháng 2 - Tháng 6 ÂL',
              tempMin: 25,
              tempMax: 30,
              moistureMin: 70,
              moistureMax: 80,
              lightMin: 15000,
              lightMax: 30000,
              nitrogenRatio: 3,
              phosphorusRatio: 1,
              potassiumRatio: 1,
              fertilizerAmount: '0.5 - 1kg/gốc',
              isActive: true,
            },
            {
              name: 'Giai đoạn 2: Đứng ngọn và phân hóa mầm hoa',
              description: 'Tháng 7 - Tháng 10 ÂL',
              tempMin: 18,
              tempMax: 28,
              moistureMin: 50,
              moistureMax: 60,
              lightMin: 10000,
              lightMax: 20000,
              nitrogenRatio: 1,
              phosphorusRatio: 3,
              potassiumRatio: 1,
              fertilizerAmount: '1 - 1.2kg/gốc',
              isActive: false,
            },
            {
              name: 'Giai đoạn 3: Nuôi nụ & thúc hoa',
              description: 'Tháng 11 - Tết (Duy trì 18-22°C thúc hoa, 12-15°C hãm hoa)',
              tempMin: 18,
              tempMax: 22,
              moistureMin: 60,
              moistureMax: 65,
              lightMin: 15000,
              lightMax: 30000,
              nitrogenRatio: 1,
              phosphorusRatio: 2,
              potassiumRatio: 3,
              fertilizerAmount: 'Tập trung K. Vd: 1:2:3',
              isActive: false,
            }
          ]
        });
        this.logger.log('Default growth stages seeded.');
      }
    } catch (e) {
      this.logger.warn('Seed failed, DB might not be ready. ' + e.message);
    }
  }

  async findAll() {
    return this.prisma.growthStage.findMany();
  }

  async getActiveStage() {
    return this.prisma.growthStage.findFirst({
      where: { isActive: true },
    });
  }

  async activateStage(id: string) {
    // 1. Deactivate all active stages
    await this.prisma.growthStage.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    
    // 2. Activate the specified stage
    return this.prisma.growthStage.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async create(data: any) {
    // If the new one is active, deactivate others
    if (data.isActive) {
      await this.prisma.growthStage.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    return this.prisma.growthStage.create({ data });
  }

  async update(id: string, data: any) {
    if (data.isActive) {
      await this.prisma.growthStage.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }
    return this.prisma.growthStage.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.growthStage.delete({
      where: { id },
    });
  }
}
