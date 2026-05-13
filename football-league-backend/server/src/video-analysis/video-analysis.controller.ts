import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Body, StreamableFile, NotFoundException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { VideoAnalysisService } from './video-analysis.service';
import { extname, join } from 'path';
import { createReadStream, existsSync, readFileSync } from 'fs';
import type { Response } from 'express';

@Controller('api/analysis')
export class VideoAnalysisController {
  constructor(private readonly analysisService: VideoAnalysisService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads/videos',
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + extname(file.originalname);
          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(mp4|avi|mov)$/)) {
          return callback(new Error('只支持MP4/AVI/MOV格式'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Body('matchId') matchId?: string) {
    const task = await this.analysisService.createTask(
      file.originalname,
      file.path,
      matchId ? parseInt(matchId) : undefined
    );

    this.analysisService.runAnalysis(task.id, file.path).catch(err => {
      console.error('分析任务失败:', err);
    });

    return {
      success: true,
      taskId: task.id,
      message: '视频上传成功，正在分析中...',
    };
  }

  @Get('task/:taskId')
  async getTaskStatus(@Param('taskId') taskId: string) {
    const task = await this.analysisService.getTaskResult(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }
    return {
      success: true,
      data: task,
    };
  }

  @Get('progress/:taskId')
  getProgress(@Param('taskId') taskId: string) {
    const progressPath = join(
      process.cwd(), '..', '..', 'video-analysis-service', 'output', taskId, 'progress.json'
    );
    if (!existsSync(progressPath)) {
      return { success: true, data: { stage: 'pending', percent: 0, message: '等待开始...' } };
    }
    try {
      const content = readFileSync(progressPath, 'utf8');
      return { success: true, data: JSON.parse(content) };
    } catch {
      return { success: true, data: { stage: 'pending', percent: 0, message: '等待开始...' } };
    }
  }

  @Get('tasks')
  async getTaskList() {
    const tasks = await this.analysisService.getTaskList();
    return {
      success: true,
      data: tasks,
    };
  }

  // 实时预览接口（最终修复版）
  @Get('file/:taskId/preview')
  getLivePreview(@Param('taskId') taskId: string, @Res() res: Response) {
    const previewPath = join(
      process.cwd(),
      '..', '..',
      'video-analysis-service',
      'output',
      taskId,
      'latest_preview.jpg'
    );

    if (!existsSync(previewPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.status(200);
      res.end();
      return;
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'image/jpeg');

    createReadStream(previewPath).pipe(res);
  }

  @Get('file/:taskId/:filename')
  getAnalysisFile(
    @Param('taskId') taskId: string,
    @Param('filename') filename: string,
  ): StreamableFile {
    const filePath = join(
      process.cwd(),
      '..', '..',
      'video-analysis-service',
      'output',
      taskId,
      filename
    );

    if (!existsSync(filePath)) {
      throw new NotFoundException(`文件不存在`);
    }

    let contentType = 'application/octet-stream';
    if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filename.endsWith('.json')) contentType = 'application/json';
    else if (filename.endsWith('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (filename.endsWith('.mp4')) contentType = 'video/mp4';

    const fileStream = createReadStream(filePath);
    return new StreamableFile(fileStream, {
      type: contentType,
      disposition: filename.endsWith('.xlsx')
        ? `attachment; filename="${filename}"`
        : 'inline'
    });
  }
}