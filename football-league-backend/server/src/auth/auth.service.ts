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

        const payload = { username: user.username, sub: user.id };
        const token = this.jwtService.sign(payload);

        return {
            user_id: user.id,
            username: user.username,
            token,
            expire_seconds: 86400,
            avatar_url: user.avatar_url || ""
        };
    }
}
