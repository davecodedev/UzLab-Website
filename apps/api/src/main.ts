import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port);

  console.log(`UzLab API listening on http://localhost:${port}/api`);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
