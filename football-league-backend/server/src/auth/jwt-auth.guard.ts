import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        // Add custom authentication logic here if needed
        // For example, checking if the token is blacklisted in Redis
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        // You can throw an exception based on either "info" or "err" arguments
        if (err || !user) {
            throw err || new UnauthorizedException({
                code: 401,
                message: '未登录或Token已过期，请重新登录。',
                data: null
            });
        }
        return user;
    }
}
