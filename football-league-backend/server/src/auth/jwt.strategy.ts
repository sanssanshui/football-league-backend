import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

export const jwtConstants = {
    secret: process.env.JWT_SECRET || 'fallback_secret_key_DO_NOT_USE_IN_PROD',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    async validate(payload: any) {
        // This payload is the decoded JWT token.
        return { userId: payload.sub, username: payload.username };
    }
}
