import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GUESS_COST = 10;
const GUESS_REWARD = 20;
const GUESS_RESULT = {
    HOME_WIN: 'HOME_WIN',
    DRAW: 'DRAW',
    AWAY_WIN: 'AWAY_WIN',
} as const;

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    private normalizeGuessResult(guessResult: string) {
        const value = String(guessResult || '').trim().toUpperCase();
        if (['HOME_WIN', '主胜'].includes(value)) return GUESS_RESULT.HOME_WIN;
        if (['DRAW', '平局'].includes(value)) return GUESS_RESULT.DRAW;
        if (['AWAY_WIN', '客胜'].includes(value)) return GUESS_RESULT.AWAY_WIN;
        return null;
    }

    private getActualGuessResult(match: { home_score: number; away_score: number }) {
        if (match.home_score > match.away_score) return GUESS_RESULT.HOME_WIN;
        if (match.home_score < match.away_score) return GUESS_RESULT.AWAY_WIN;
        return GUESS_RESULT.DRAW;
    }

    // 获取用户完整个人信息（含积分、关注球队）
    async getUserProfile(userId: number) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                score: true,
                avatar_url: true,
                gender: true,
                birthday: true,
                birthplace: true,
                bio: true,
                createdAt: true,
                focusTeams: {
                    select: { id: true, name: true, city: true, logo_url: true }
                }
            }
        });
    }

    // 更新用户关注球队
    async updateFocusTeams(userId: number, teamIds: number[]) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                focusTeams: {
                    set: teamIds.map(id => ({ id }))
                }
            },
            select: {
                focusTeams: {
                    select: { id: true, name: true, city: true, logo_url: true }
                }
            }
        });
    }

    // 获取用户竞猜记录
    async getUserGuesses(userId: number) {
        const guesses = await this.prisma.guess.findMany({
            where: { user_id: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                match: {
                    include: {
                        home_team: { select: { id: true, name: true } },
                        away_team: { select: { id: true, name: true } }
                    }
                }
            }
        });

        return guesses.map((guess) => ({
            ...guess,
            guess_result: guess.guess_result === GUESS_RESULT.HOME_WIN ? '主胜' : guess.guess_result === GUESS_RESULT.AWAY_WIN ? '客胜' : guess.guess_result === GUESS_RESULT.DRAW ? '平局' : guess.guess_result,
        }));
    }

    // 获取所有球队列表（用于关注选择）
    async getAllTeams() {
        return this.prisma.team.findMany({
            orderBy: { city: 'asc' },
            select: { id: true, name: true, city: true, logo_url: true }
        });
    }

    // 提交竞猜（每场比赛每用户只能猜一次，消耗10积分）
    async createGuess(userId: number, matchId: number, guessResult: string) {
        const normalizedGuessResult = this.normalizeGuessResult(guessResult);
        if (!normalizedGuessResult) throw new Error('竞猜结果参数错误');

        // 检查比赛是否存在且未开赛
        const match = await this.prisma.match.findUnique({ where: { id: matchId } });
        if (!match) throw new Error('比赛不存在');
        if (match.status !== 0) throw new Error('该比赛已开始或已结束，无法竞猜');

        const now = new Date();
        if (now >= match.match_time) {
            throw new Error('该比赛已到开赛时间，无法竞猜');
        }

        // 检查用户积分是否足够（不足时自动补充到100，保留原逻辑）
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('用户不存在');
        if (user.score < GUESS_COST) {
            await this.prisma.user.update({ where: { id: userId }, data: { score: 100 } });
        }

        // 检查是否已竞猜过该场比赛
        const existing = await this.prisma.guess.findUnique({
            where: { uk_user_match_guess: { user_id: userId, match_id: matchId } }
        });
        if (existing) throw new Error('您已对该场比赛进行过竞猜');

        const [guess] = await this.prisma.$transaction([
            this.prisma.guess.create({
                data: {
                    user_id: userId,
                    match_id: matchId,
                    guess_result: normalizedGuessResult,
                    score_cost: GUESS_COST,
                    status: 0
                },
                include: {
                    match: {
                        include: {
                            home_team: { select: { id: true, name: true } },
                            away_team: { select: { id: true, name: true } }
                        }
                    }
                }
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: { score: { decrement: GUESS_COST } }
            })
        ]);

        return {
            ...guess,
            guess_result: normalizedGuessResult === GUESS_RESULT.HOME_WIN ? '主胜' : normalizedGuessResult === GUESS_RESULT.AWAY_WIN ? '客胜' : '平局',
        };
    }

    // 清空用户所有竞猜记录并重置积分
    async clearGuesses(userId: number) {
        await this.prisma.$transaction([
            this.prisma.guess.deleteMany({ where: { user_id: userId } }),
            this.prisma.user.update({ where: { id: userId }, data: { score: 0 } }),
        ]);
        return { cleared: true };
    }

    // 更新用户个人信息（头像URL、性别、生日、出生地、签名）
    async updateProfile(userId: number, data: {
        avatar_url?: string;
        gender?: string;
        birthday?: string;
        birthplace?: string;
        bio?: string;
    }) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, username: true, score: true, avatar_url: true, gender: true, birthday: true, birthplace: true, bio: true }
        });
    }

    // 评估竞猜结果（当比赛结束时调用）
    async evaluateGuesses(matchId: number) {
        const match = await this.prisma.match.findUnique({ where: { id: matchId } });
        if (!match || match.status !== 2) return; // 只处理已结束的比赛

        // 确定实际结果
        const actualResult = this.getActualGuessResult(match);

        // 获取该场比赛的所有竞猜
        const guesses = await this.prisma.guess.findMany({
            where: { match_id: matchId, status: 0 } // 只处理未评估的
        });

        for (const guess of guesses) {
            const isCorrect = guess.guess_result === actualResult;

            await this.prisma.$transaction([
                // 更新竞猜记录
                this.prisma.guess.update({
                    where: { id: guess.id },
                    data: {
                        status: isCorrect ? 1 : 2,
                        isCorrect,
                        score_reward: isCorrect ? GUESS_REWARD : 0
                    }
                }),
                // 如果猜对了，增加用户积分
                ...(isCorrect ? [
                    this.prisma.user.update({
                        where: { id: guess.user_id },
                        data: { score: { increment: GUESS_REWARD } }
                    })
                ] : [])
            ]);
        }

        return { evaluated: guesses.length, actualResult };
    }
}