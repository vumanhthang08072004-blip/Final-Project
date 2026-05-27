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
var SensorController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const sensor_service_1 = require("./sensor.service");
let SensorController = SensorController_1 = class SensorController {
    constructor(sensorService) {
        this.sensorService = sensorService;
        this.logger = new common_1.Logger(SensorController_1.name);
    }
    async handleMqttSensorData(data) {
        this.logger.log(`MQTT Received Payload: ${JSON.stringify(data)}`);
        return this.sensorService.recordData(data, 'ESP32_Thang_MQTT');
    }
    async receiveData(data) {
        return this.sensorService.recordData(data, 'ESP32_Thang_HTTP');
    }
    async getLatest() {
        return this.sensorService.getLatestReadings(1);
    }
    async getHistory() {
        return this.sensorService.getRecentHistory('336');
    }
};
exports.SensorController = SensorController;
__decorate([
    (0, microservices_1.MessagePattern)('bkhn/thang/sensors'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SensorController.prototype, "handleMqttSensorData", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SensorController.prototype, "receiveData", null);
__decorate([
    (0, common_1.Get)('latest'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SensorController.prototype, "getLatest", null);
__decorate([
    (0, common_1.Get)('history'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SensorController.prototype, "getHistory", null);
exports.SensorController = SensorController = SensorController_1 = __decorate([
    (0, common_1.Controller)('api/sensor-data'),
    __metadata("design:paramtypes", [sensor_service_1.SensorService])
], SensorController);
//# sourceMappingURL=sensor.controller.js.map