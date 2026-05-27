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
var PumpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mqtt = require("mqtt");
let PumpService = PumpService_1 = class PumpService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PumpService_1.name);
        this.MQTT_TOPIC = 'bkhn/thang/pump/control';
        this.mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');
        this.mqttClient.on('connect', () => {
            this.logger.log('Native MQTT Client connected to HiveMQ for Pump Control');
        });
        this.mqttClient.on('error', (err) => {
            this.logger.error('Native MQTT Client error: ' + err.message);
        });
    }
    async onModuleInit() {
        try {
            const state = await this.prisma.pumpState.findUnique({ where: { id: 1 } });
            if (!state) {
                await this.prisma.pumpState.create({
                    data: { id: 1, isAuto: true, isOn: false },
                });
                this.logger.log('Seeded initial Pump State (Auto=true, isOn=false)');
            }
        }
        catch (e) {
            this.logger.warn('Could not seed PumpState. DB might not be pushed.' + e.message);
        }
    }
    async getPumpState() {
        let state = await this.prisma.pumpState.findUnique({ where: { id: 1 } });
        if (!state) {
            state = await this.prisma.pumpState.create({ data: { id: 1 } });
        }
        return state;
    }
    async setMode(isAuto) {
        const updated = await this.prisma.pumpState.update({
            where: { id: 1 },
            data: { isAuto },
        });
        this.logger.log(`Pump mode changed. isAuto: ${isAuto}`);
        return updated;
    }
    async manualToggle(isOn) {
        const state = await this.getPumpState();
        if (state.isAuto) {
            throw new common_1.BadRequestException('Cannot manually toggle pump while in Auto mode.');
        }
        return this.triggerPump(isOn);
    }
    async autoTriggerPump(isOn) {
        const state = await this.getPumpState();
        if (!state.isAuto)
            return state;
        if (state.isOn !== isOn) {
            return this.triggerPump(isOn);
        }
        return state;
    }
    async triggerPump(isOn) {
        const stateStr = isOn ? 'ON' : 'OFF';
        const payload = JSON.stringify({ state: stateStr });
        this.mqttClient.publish(this.MQTT_TOPIC, payload, { qos: 0 }, (error) => {
            if (error) {
                this.logger.error(`Failed to publish RAW MQTT -> ${this.MQTT_TOPIC}: ${payload}`, error);
            }
            else {
                this.logger.log(`Published RAW MQTT -> ${this.MQTT_TOPIC}: ${payload}`);
            }
        });
        const updated = await this.prisma.pumpState.update({
            where: { id: 1 },
            data: { isOn },
        });
        return updated;
    }
};
exports.PumpService = PumpService;
exports.PumpService = PumpService = PumpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PumpService);
//# sourceMappingURL=pump.service.js.map