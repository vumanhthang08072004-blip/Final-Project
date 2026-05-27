import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class PumpService implements OnModuleInit {
    private prisma;
    private readonly logger;
    private readonly MQTT_TOPIC;
    private mqttClient;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    getPumpState(): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
    setMode(isAuto: boolean): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
    manualToggle(isOn: boolean): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
    autoTriggerPump(isOn: boolean): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
    private triggerPump;
}
