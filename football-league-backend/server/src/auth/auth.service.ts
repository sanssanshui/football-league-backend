import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    // Hash password using pbkdf2 as described in original python API
    private hashPassword(password: string): string {
        const salt = 'football_league_salt'; // In real app, generate random salt per user
        return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
    }

    async register(username: string, passwordRaw: string, phone?: string) {
        const existing = await this.prisma.user.findUnique({ where: { username } });
        if (existing) {
            throw new ConflictException('用户名已存在');
        }

        const hashedPassword = this.hashPassword(passwordRaw);
        const user = await this.prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                // openid could store phone temporarily if needed or we could add a phone column.
                // For now, based on schema, just store username and password
            }
        });

        return {
            user_id: user.id,
            username: user.username,
            score: user.score,
            create_time: user.createdAt
        };
    }

    async login(username: string, passwordRaw: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
        throw new UnauthorizedException('用户名或密码错误');
    }

    const hashedPassword = this.hashPassword(passwordRaw);
    if (user.password !== hashedPassword) {
        throw new UnauthorizedException('用户名或密码错误');
    }

    // 1. 修改payload：使用userId而非sub，与controller里的req.user.userId完全对应
    const payload = { userId: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
        // 2. 核心字段名统一为要求的格式
        access_token: token,
        userId: user.id,
        username: user.username,
        // 3. 保留原有的实用扩展字段（前端可能需要，如不需要可删除）
        expire_seconds: 86400,
        avatar_url: user.avatar_url || ""
    };
}
}
