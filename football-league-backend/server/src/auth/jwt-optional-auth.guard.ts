import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Never throw — just attach user if token is valid, leave req.user undefined otherwise
  handleRequest(_err: any, user: any) {
    return user ?? null;
  }
}
