import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS so the NextJS frontend can call this backend
  app.enableCors();

  // Connect Microservice (MQTTS) matching ESP32 HiveMQ Cloud broker
  const mqttUrl = process.env.MQTT_URL || 'mqtts://xxxxxxxxxxxx.s1.eu.hivemq.cloud:8883';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: mqttUrl,
      username: process.env.MQTT_USER,
      password: process.env.MQTT_PASS,
      rejectUnauthorized: true, // Bảo mật TLS: xác thực chứng chỉ server
    },
  });

  await app.startAllMicroservices();
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`MQTT Microservice connected to: ${mqttUrl}`);
}
bootstrap();

