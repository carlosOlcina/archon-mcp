import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  return app;
}

if (process.env['NODE_ENV'] !== 'test' && !process.env['VITEST']) {
  bootstrap().then(async (app) => {
    const port = process.env['PORT'] ?? 3000;
    await app.listen(port);
  });
}
