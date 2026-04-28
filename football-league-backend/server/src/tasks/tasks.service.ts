import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        private prisma: PrismaService,
        private usersService: UsersService
    ) {}

    // 每小时检查一次已结束的比赛并评估竞猜
    @Cron(CronExpression.EVERY_HOUR)
    async evaluateFinishedMatches() {
        this.logger.log('Checking for finished matches to evaluate guesses...');

        try {
            // 查找所有已结束(status=2)且有未评估竞猜的比赛
            const finishedMatches = await this.prisma.match.findMany({
                where: {
                    status: 2,
                    guesses: {
                        some: { status: 0 } // 有未评估的竞猜
                    }
                },
                select: { id: true }
            });

            for (const match of finishedMatches) {
                const result = await this.usersService.evaluateGuesses(match.id);
                
                // ===================== 修复核心逻辑 =====================
                // 先判断result是否有有效值，避免空值报错
                if (result && typeof result.evaluated !== 'undefined') {
                    this.logger.log(`Evaluated ${result.evaluated} guesses for match ${match.id}`);
                } else {
                    // 空值时打印警告日志，方便后续排查问题（比如这场比赛没有用户竞猜）
                    this.logger.warn(`No valid guesses evaluated for match ${match.id}, result is empty or invalid`);
                }
                // =======================================================
            }

            this.logger.log(`Finished evaluating ${finishedMatches.length} matches`);
        } catch (error) {
            this.logger.error('Failed to evaluate guesses:', error);
        }
    }

    // 每天凌晨2点更新比赛状态（将过期的未开始比赛标记为已取消）
    @Cron('0 2 * * *')
    async updateExpiredMatches() {
        this.logger.log('Updating expired matches...');

        try {
            const now = new Date();
            const result = await this.prisma.match.updateMany({
                where: {
                    status: 0,
                    match_time: { lt: now }
                },
                data: { status: 3 } // 3 = 已取消
            });

            this.logger.log(`Updated ${result.count} expired matches`);
        } catch (error) {
            this.logger.error('Failed to update expired matches:', error);
        }
    }
}