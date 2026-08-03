import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Railway terminates TLS and forwards, so without this every request
  // arrives wearing the proxy's address: rate limits would key on one IP and
  // throttle all visitors together while doing nothing to an attacker.
  app.set('trust proxy', 1);

  // The API serves JSON to a separate origin — it renders no HTML of its own,
  // so the header set that matters is the transport and sniffing one rather
  // than a content policy. CSP is disabled here because there is no document
  // to apply it to; the site's own CSP belongs with the site.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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
