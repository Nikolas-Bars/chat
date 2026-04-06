import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

function getCorsOrigins(): string[] {
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const extra =
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  return [...new Set([...defaults, ...extra])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
