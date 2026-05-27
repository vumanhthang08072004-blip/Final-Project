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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthStageController = void 0;
const common_1 = require("@nestjs/common");
const growth_stage_service_1 = require("./growth-stage.service");
let GrowthStageController = class GrowthStageController {
    constructor(growthStageService) {
        this.growthStageService = growthStageService;
    }
    getAll() {
        return this.growthStageService.findAll();
    }
    getActive() {
        return this.growthStageService.getActiveStage();
    }
    create(data) {
        return this.growthStageService.create(data);
    }
    update(id, data) {
        return this.growthStageService.update(id, data);
    }
    delete(id) {
        return this.growthStageService.delete(id);
    }
    activate(id) {
        return this.growthStageService.activateStage(id);
    }
};
exports.GrowthStageController = GrowthStageController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GrowthStageController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GrowthStageController.prototype, "getActive", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GrowthStageController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GrowthStageController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GrowthStageController.prototype, "delete", null);
__decorate([
    (0, common_1.Put)(':id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GrowthStageController.prototype, "activate", null);
exports.GrowthStageController = GrowthStageController = __decorate([
    (0, common_1.Controller)('growth-stages'),
    __metadata("design:paramtypes", [growth_stage_service_1.GrowthStageService])
], GrowthStageController);
//# sourceMappingURL=growth-stage.controller.js.map