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

  // ✅ 恢复端口5002，避免 macOS 控制中心 5000 端口冲突，并与前端环境变量统一
  await app.listen(process.env.PORT || 5002);
  console.log('🚀 后端服务启动成功：http://localhost:5002');
}
bootstrap();