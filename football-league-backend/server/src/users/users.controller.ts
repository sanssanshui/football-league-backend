import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // 示例：这个接口现在被保护了。只有携带有效JWT Token的用户才能访问。
    // 未登录游客访问会被抛出 401 Unauthorized。
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: any) {
        // req.user 包含了 JWT payload 里面的内容（比如 user.id, username）
        return {
            code: 200,
            message: '获取个人信息成功',
            data: req.user
        };
    }
}
