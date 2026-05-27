"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GrowthStageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthStageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GrowthStageService = GrowthStageService_1 = class GrowthStageService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GrowthStageService_1.name);
    }
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
        }
        catch (e) {
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
    async activateStage(id) {
        await this.prisma.growthStage.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        return this.prisma.growthStage.update({
            where: { id },
            data: { isActive: true },
        });
    }
    async create(data) {
        if (data.isActive) {
            await this.prisma.growthStage.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });
        }
        return this.prisma.growthStage.create({ data });
    }
    async update(id, data) {
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
    async delete(id) {
        return this.prisma.growthStage.delete({
            where: { id },
        });
    }
};
exports.GrowthStageService = GrowthStageService;
exports.GrowthStageService = GrowthStageService = GrowthStageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GrowthStageService);
//# sourceMappingURL=growth-stage.service.js.map