import { Controller, Get, UseGuards, Request, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/user')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // 原有接口保留，不改动
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req: any) {
        const user = await this.usersService.getUserProfile(req.user.userId);
        return {
            code: 200,
            message: '获取个人信息成功',
            data: user
        };
    }

    // 新增：获取所有球队列表
    @UseGuards(JwtAuthGuard)
    @Get('teams')
    async getAllTeams() {
        const teams = await this.usersService.getAllTeams();
        return {
            code: 200,
            message: '获取球队列表成功',
            data: teams
        };
    }

    // 新增：更新用户关注球队
    @UseGuards(JwtAuthGuard)
    @Put('focus-teams')
    async updateFocusTeams(@Request() req: any, @Body() body: { teamIds: number[] }) {
        const { teamIds } = body;
        if (!Array.isArray(teamIds)) {
            return { code: 400, message: '参数错误', data: {} };
        }
        const focusTeams = await this.usersService.updateFocusTeams(req.user.userId, teamIds);
        return {
            code: 200,
            message: '更新关注球队成功',
            data: focusTeams
        };
    }

    // 新增：获取用户竞猜记录
    @UseGuards(JwtAuthGuard)
    @Get('guesses')
    async getUserGuesses(@Request() req: any) {
        const guesses = await this.usersService.getUserGuesses(req.user.userId);
        return {
            code: 200,
            message: '获取竞猜记录成功',
            data: guesses
        };
    }
}