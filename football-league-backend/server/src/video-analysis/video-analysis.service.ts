// server/src/video-analysis/video-analysis.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { spawn } from 'child_process';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class VideoAnalysisService {
  constructor(private prisma: PrismaService) {}

  // 1. 创建分析任务
  async createTask(videoName: string, videoPath: string, matchId?: number) {
    return this.prisma.videoAnalysisTask.create({
      data: {
        videoName,
        videoPath,
        matchId,
        status: 'pending',
      },
    });
  }

  // 2. 执行分析任务（Spawn 无缓冲 + 无超时）
  async runAnalysis(taskId: string, videoPath: string) {
    await this.prisma.videoAnalysisTask.update({
      where: { id: taskId },
      data: { status: 'processing' },
    });

    // -------------- 路径配置 --------------
    const analysisServiceDir = join(process.cwd(), '../../video-analysis-service');
    const pythonExe = join(analysisServiceDir, '.venv', 'Scripts', 'python.exe');
    const scriptPath = join(analysisServiceDir, 'analysis_api.py');
    const absoluteVideoPath = join(process.cwd(), videoPath);
    const resultPath = join(analysisServiceDir, 'output', taskId, 'result.json');

    return new Promise<void>((resolve, reject) => {
      // ==============================================
      // ✅ 使用 spawn，无 buffer 限制，无超时
      // ==============================================
      const pythonProcess = spawn(pythonExe, [scriptPath, absoluteVideoPath, taskId], {
        cwd: analysisServiceDir,
      });

      // 实时输出日志（方便调试）
      pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python LOG] ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python ERROR] ${data}`);
      });

      // 任务结束
      pythonProcess.on('close', async (code) => {
        try {
          if (code !== 0) {
            throw new Error(`Python 进程退出码：${code}`);
          }

          // 读取结果
          const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

          // 更新数据库
          await this.prisma.videoAnalysisTask.update({
            where: { id: taskId },
            data: {
              status: 'completed',
              completedAt: new Date(),
              totalPlayers: result.total_players,
              passCount: result.pass_count,
              resultJson: JSON.stringify(result),
            },
          });

          resolve();
        } catch (err) {
          await this.prisma.videoAnalysisTask.update({
            where: { id: taskId },
            data: { status: 'failed' },
          });
          reject(err);
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Python 启动失败：', err);
        reject(err);
      });
    });
  }

  // 3. 获取任务状态
  async getTaskResult(taskId: string) {
    return this.prisma.videoAnalysisTask.findUnique({
      where: { id: taskId },
    });
  }

  // 4. 获取任务列表
  async getTaskList() {
    return this.prisma.videoAnalysisTask.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}