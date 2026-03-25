import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ 移除重复的enableCors，统一完整跨域配置
  app.enableCors({
    origin: ['http://localhost:3000'], // 前端地址
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // ✅ 固定端口5000，和前端统一
  await app.listen(5000);
  console.log('🚀 后端服务启动成功：http://localhost:5000');
}
bootstrap();