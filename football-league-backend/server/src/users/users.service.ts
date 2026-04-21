import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

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
        return this.prisma.guess.findMany({
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
        const COST = 10;

        // 检查比赛是否存在且状态为待开始(0)
        const match = await this.prisma.match.findUnique({ where: { id: matchId } });
        if (!match) throw new Error('比赛不存在');
        if (match.status !== 0) throw new Error('该比赛已开始或已结束，无法竞猜');

        // 检查用户积分是否足够（不足时自动补充到100）
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('用户不存在');
        if (user.score < COST) {
            await this.prisma.user.update({ where: { id: userId }, data: { score: 100 } });
        }

        // 检查是否已竞猜过该场比赛
        const existing = await this.prisma.guess.findUnique({
            where: { uk_user_match_guess: { user_id: userId, match_id: matchId } }
        });
        if (existing) throw new Error('您已对该场比赛进行过竞猜');

        // 扣除积分并创建竞猜记录（事务）
        const [guess] = await this.prisma.$transaction([
            this.prisma.guess.create({
                data: { user_id: userId, match_id: matchId, guess_result: guessResult, score_cost: COST, status: 0 },
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
                data: { score: { decrement: COST } }
            })
        ]);
        return guess;
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
}