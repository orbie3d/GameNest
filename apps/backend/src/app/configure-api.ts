import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ApiExceptionFilter } from './api-exception.filter';

export function configureApi(app: INestApplication, corsOrigins: string[]): void {
  app.setGlobalPrefix('api/v1');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // Swagger runs on plain HTTP locally; production keeps HTTPS upgrading.
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }));
  app.enableCors({ origin: corsOrigins });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }));
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  const config = new DocumentBuilder()
    .setTitle('GameNest API')
    .setDescription('API del MVP de GameNest. Registro, sesiones y cuenta del usuario.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  SwaggerModule.setup('api/v1/docs', app, () => SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'api/v1/openapi.json',
    raw: ['json'],
    swaggerOptions: { persistAuthorization: false, displayRequestDuration: true },
    customSiteTitle: 'GameNest API',
  });
}
