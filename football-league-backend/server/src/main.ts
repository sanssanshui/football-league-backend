import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ 完整跨域配置
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // ✅ 关键修复：设置请求体大小限制（Express 原生中间件）
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // ✅ 端口配置
  await app.listen(process.env.PORT || 5002);
  console.log('🚀 后端服务启动成功：http://localhost:5002');
}

bootstrap();