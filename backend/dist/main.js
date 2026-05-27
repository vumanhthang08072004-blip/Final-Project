"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    const mqttUrl = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883';
    app.connectMicroservice({
        transport: microservices_1.Transport.MQTT,
        options: {
            url: mqttUrl,
        },
    });
    await app.startAllMicroservices();
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map