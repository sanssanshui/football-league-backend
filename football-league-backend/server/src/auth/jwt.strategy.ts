import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

export const jwtConstants = {
    // 生产环境必须用环境变量，本地开发保留兜底密钥
    secret: process.env.JWT_SECRET || 'football_league_secure_key_2026',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            // 从请求头 Authorization: Bearer <token> 提取令牌
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // 强制校验令牌过期时间
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    // ✅ 核心修复：和 AuthService 签发的 payload 完全对齐
    // 签发时：{ userId: user.id, username: user.username }
    async validate(payload: { userId: number; username: string }) {
        return { 
            userId: payload.userId, 
            username: payload.username 
        };
    }
}