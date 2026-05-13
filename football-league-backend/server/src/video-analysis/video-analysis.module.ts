// server/src/video-analysis/video-analysis.module.ts
import { Module } from '@nestjs/common';
import { VideoAnalysisService } from './video-analysis.service';
import { VideoAnalysisController } from './video-analysis.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VideoAnalysisController],
  providers: [VideoAnalysisService],
  exports: [VideoAnalysisService],
})
export class VideoAnalysisModule {}