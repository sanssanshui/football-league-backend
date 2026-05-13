import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlayerProfileService } from './player-profile.service';
import type { PlayerProfileInput } from './player-profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/player-profile')
@UseGuards(JwtAuthGuard)
export class PlayerProfileController {
  constructor(private readonly playerProfileService: PlayerProfileService) {}

  // 生成球员能力值（不保存）
  @Post('analyze')
  analyzePlayer(@Body() input: PlayerProfileInput) {
    const analysis = this.playerProfileService.analyzePlayer(input);
    return {
      code: 200,
      message: '分析成功',
      data: analysis,
    };
  }

  // 创建并保存球员档案
  @Post()
  async createProfile(@Request() req: any, @Body() input: PlayerProfileInput) {
    const userId = req.user.userId;
    const profile = await this.playerProfileService.createProfile(userId, input);
    return {
      code: 200,
      message: '档案创建成功',
      data: profile,
    };
  }

  // 获取当前用户的所有档案
  @Get()
  async getUserProfiles(@Request() req: any) {
    const userId = req.user.userId;
    const profiles = await this.playerProfileService.getUserProfiles(userId);
    return {
      code: 200,
      message: '获取成功',
      data: profiles,
    };
  }

  // 获取单个档案详情
  @Get(':id')
  async getProfileById(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const profile = await this.playerProfileService.getProfileById(+id, userId);
    if (!profile) {
      return {
        code: 404,
        message: '档案不存在',
      };
    }
    return {
      code: 200,
      message: '获取成功',
      data: profile,
    };
  }

  // 更新档案
  @Put(':id')
  async updateProfile(@Request() req: any, @Param('id') id: string, @Body() input: PlayerProfileInput) {
    const userId = req.user.userId;
    await this.playerProfileService.updateProfile(+id, userId, input);
    const updated = await this.playerProfileService.getProfileById(+id, userId);
    return {
      code: 200,
      message: '更新成功',
      data: updated,
    };
  }

  // 删除档案
  @Delete(':id')
  async deleteProfile(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    await this.playerProfileService.deleteProfile(+id, userId);
    return {
      code: 200,
      message: '删除成功',
    };
  }
}
