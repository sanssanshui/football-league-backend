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
}