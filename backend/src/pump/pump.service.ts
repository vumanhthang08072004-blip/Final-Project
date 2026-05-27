import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as mqtt from 'mqtt';

@Injectable()
export class PumpService implements OnModuleInit {
  private readonly logger = new Logger(PumpService.name);
  private readonly MQTT_TOPIC = 'bkhn/thang/pump/control';
  private mqttClient: mqtt.MqttClient;

  constructor(private prisma: PrismaService) {
    this.mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');
    
    this.mqttClient.on('connect', () => {
      this.logger.log('Native MQTT Client connected to HiveMQ for Pump Control');
    });

    this.mqttClient.on('error', (err) => {
      this.logger.error('Native MQTT Client error: ' + err.message);
    });
  }

  async onModuleInit() {
    // Ensure PumpState with ID=1 exists upon start
    try {
      const state = await this.prisma.pumpState.findUnique({ where: { id: 1 } });
      if (!state) {
        await this.prisma.pumpState.create({
          data: { id: 1, isAuto: true, isOn: false },
        });
        this.logger.log('Seeded initial Pump State (Auto=true, isOn=false)');
      }
    } catch (e) {
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

  async setMode(isAuto: boolean) {
    const updated = await this.prisma.pumpState.update({
      where: { id: 1 },
      data: { isAuto },
    });
    this.logger.log(`Pump mode changed. isAuto: ${isAuto}`);
    return updated;
  }

  async manualToggle(isOn: boolean) {
    const state = await this.getPumpState();
    if (state.isAuto) {
      throw new BadRequestException('Cannot manually toggle pump while in Auto mode.');
    }
    return this.triggerPump(isOn);
  }

  async autoTriggerPump(isOn: boolean) {
    const state = await this.getPumpState();
    if (!state.isAuto) return state; // Ignore auto trigger if in manual mode
    
    // Check if the state actually changes to avoid spamming MQTT
    if (state.isOn !== isOn) {
      return this.triggerPump(isOn);
    }
    return state;
  }

  private async triggerPump(isOn: boolean) {
    // 1. Publish to MQTT via Native Client
    const stateStr = isOn ? 'ON' : 'OFF';
    const payload = JSON.stringify({ state: stateStr });
    
    this.mqttClient.publish(this.MQTT_TOPIC, payload, { qos: 0 }, (error) => {
      if (error) {
        this.logger.error(`Failed to publish RAW MQTT -> ${this.MQTT_TOPIC}: ${payload}`, error);
      } else {
        this.logger.log(`Published RAW MQTT -> ${this.MQTT_TOPIC}: ${payload}`);
      }
    });

    // 2. Update DB State
    const updated = await this.prisma.pumpState.update({
      where: { id: 1 },
      data: { isOn },
    });
    return updated;
  }
}
