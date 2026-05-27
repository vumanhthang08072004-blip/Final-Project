import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS so the NextJS frontend can call this backend
  app.enableCors();

  // Connect Microservice (MQTT) matching your ESP32 broker
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: 'mqtt://broker.hivemq.com:1883',
    },
  });

  await app.startAllMicroservices();
  await app.listen(3001);
}
bootstrap();
