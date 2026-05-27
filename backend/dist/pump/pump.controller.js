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
exports.PumpController = void 0;
const common_1 = require("@nestjs/common");
const pump_service_1 = require("./pump.service");
let PumpController = class PumpController {
    constructor(pumpService) {
        this.pumpService = pumpService;
    }
    async getState() {
        return this.pumpService.getPumpState();
    }
    async toggleMode(isAuto) {
        return this.pumpService.setMode(isAuto);
    }
    async togglePump(isOn) {
        return this.pumpService.manualToggle(isOn);
    }
};
exports.PumpController = PumpController;
__decorate([
    (0, common_1.Get)('state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PumpController.prototype, "getState", null);
__decorate([
    (0, common_1.Put)('mode'),
    __param(0, (0, common_1.Body)('isAuto')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], PumpController.prototype, "toggleMode", null);
__decorate([
    (0, common_1.Put)('toggle'),
    __param(0, (0, common_1.Body)('isOn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], PumpController.prototype, "togglePump", null);
exports.PumpController = PumpController = __decorate([
    (0, common_1.Controller)('api/pump'),
    __metadata("design:paramtypes", [pump_service_1.PumpService])
], PumpController);
//# sourceMappingURL=pump.controller.js.map