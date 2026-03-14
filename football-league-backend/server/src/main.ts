import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // 允许前端跨域访问
  await app.listen(process.env.PORT ?? 5002);
}
bootstrap();
