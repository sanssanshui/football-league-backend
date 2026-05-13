import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/user')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.OK)
    async register(@Body() body: any) {
        const { username, password, phone } = body;
        if (!username || !password) {
            return { code: 400, message: '必填项缺失', data: {} };
        }
        try {
            const data = await this.authService.register(username, password, phone);
            return { code: 200, message: '注册成功', data };
        } catch (e: any) {
            return { code: 400, message: e.message || '参数错误', data: {} };
        }
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: any) {
        const { username, password } = body;
        if (!username || !password) {
            return { code: 400, message: '必填项缺失', data: {} };
        }
        try {
            const data = await this.authService.login(username, password);
            return { code: 200, message: '登录成功', data };
        } catch (e: any) {
            return { code: 401, message: '用户名或密码错误', data: {} };
        }
    }
}
