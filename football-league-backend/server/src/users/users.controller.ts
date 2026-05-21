import { BadRequestException, Body, Controller, Delete, Get, Post, Put, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/user')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    private readonly allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

    // 新增：提交竞猜
    @UseGuards(JwtAuthGuard)
    @Post('guesses')
    async createGuess(@Request() req: any, @Body() body: { matchId: number; guessResult: string }) {
        try {
            if (!body || !body.matchId || !body.guessResult) {
                return { code: 400, message: '参数错误', data: null };
            }
            const guess = await this.usersService.createGuess(req.user.userId, Number(body.matchId), body.guessResult);
            return { code: 200, message: '竞猜提交成功', data: guess };
        } catch (e: any) {
            return { code: 400, message: e.message || '竞猜失败', data: null };
        }
    }

    // 新增：清空竞猜记录并重置积分
    @UseGuards(JwtAuthGuard)
    @Delete('guesses')
    async clearGuesses(@Request() req: any) {
        try {
            await this.usersService.clearGuesses(req.user.userId);
            return { code: 200, message: '竞猜记录已清空', data: null };
        } catch (e: any) {
            return { code: 500, message: e.message || '清空失败', data: null };
        }
    }

    // 新增：更新个人信息
    @UseGuards(JwtAuthGuard)
    @Put('profile')
    async updateProfile(@Request() req: any, @Body() body: {
        avatar_url?: string;
        gender?: string;
        birthday?: string;
        birthplace?: string;
        bio?: string;
    }) {
        try {
            const data = await this.usersService.updateProfile(req.user.userId, body);
            return { code: 200, message: '个人信息更新成功', data };
        } catch (e: any) {
            return { code: 500, message: e.message || '更新失败', data: null };
        }
    }

    // 上传头像：保存图片文件，返回可直接访问的短URL
    @UseGuards(JwtAuthGuard)
    @Post('avatar')
    @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 2 * 1024 * 1024 } }))
    async uploadAvatar(@UploadedFile() file: any, @Request() req: any) {
        try {
            if (!file) {
                throw new BadRequestException('请选择要上传的头像');
            }
            if (!this.allowedAvatarTypes.has(file.mimetype)) {
                throw new BadRequestException('头像只支持 jpg、png、webp 或 gif 格式');
            }

            const uploadDir = join(process.cwd(), 'uploads', 'avatars');
            mkdirSync(uploadDir, { recursive: true });

            const ext = this.getExtByMime(file.mimetype);
            const filename = `${Date.now()}-${randomUUID()}${ext.toLowerCase()}`;
            const relativeUrl = `/uploads/avatars/${filename}`;
            writeFileSync(join(uploadDir, filename), file.buffer);

            return {
                code: 200,
                message: '头像上传成功',
                data: { avatar_url: `${req.protocol}://${req.get('host')}${relativeUrl}` },
            };
        } catch (e: any) {
            return { code: e.status || 500, message: e.message || '头像上传失败', data: null };
        }
    }

    private getExtByMime(mimetype: string) {
        if (mimetype === 'image/png') return '.png';
        if (mimetype === 'image/webp') return '.webp';
        if (mimetype === 'image/gif') return '.gif';
        return '.jpg';
    }
}
