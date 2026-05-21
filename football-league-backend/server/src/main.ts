import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // 静态文件服务：提供上传文件访问
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // 静态文件服务：分析结果输出
  app.useStaticAssets(
    join(process.cwd(), '..', '..', 'video-analysis-service', 'output'),
    {
      prefix: '/analysis-results/',
    },
  );

  // ✅ 端口配置
  await app.listen(process.env.PORT || 5002);
  console.log('🚀 后端服务启动成功：http://localhost:5002');
}

bootstrap();
