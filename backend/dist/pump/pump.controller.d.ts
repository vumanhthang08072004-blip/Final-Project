import { PumpService } from './pump.service';
export declare class PumpController {
    private readonly pumpService;
    constructor(pumpService: PumpService);
    getState(): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
    toggleMode(isAuto: boolean): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
    togglePump(isOn: boolean): Promise<{
        id: number;
        isAuto: boolean;
        isOn: boolean;
        updatedAt: Date;
    }>;
}
