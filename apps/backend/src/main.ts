import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { configureApi } from './app/configure-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  configureApi(app, config.getOrThrow<string>('CORS_ORIGIN').split(',').map((value) => value.trim()));
  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  Logger.log(`GameNest API: http://localhost:${port}/api/v1`);
  Logger.log(`Swagger: http://localhost:${port}/api/v1/docs`);
}

bootstrap().catch(() => {
  Logger.error('Unable to start GameNest. Check configuration and database availability.');
  process.exitCode = 1;
});
