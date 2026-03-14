import { Body, Controller, Get, Post, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SocialService } from './social.service';

@Controller('api/social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow/user')
  async followUser(@Request() req: any, @Body('user_id') userId: number) {
    const data = await this.socialService.followUser(Number(req.user.userId), Number(userId));
    return { code: 200, message: '关注成功', data };
  }

  @Delete('follow/user')
  async unfollowUser(@Request() req: any, @Query('user_id') userId: number) {
    const data = await this.socialService.unfollowUser(Number(req.user.userId), Number(userId));
    return { code: 200, message: '取消关注成功', data };
  }

  @Get('follow/user/list')
  async listFollowing(@Request() req: any) {
    const data = await this.socialService.listFollowing(Number(req.user.userId));
    return { code: 200, message: '查询成功', data };
  }

  @Get('follow/user/fans')
  async listFollowers(@Request() req: any) {
    const data = await this.socialService.listFollowers(Number(req.user.userId));
    return { code: 200, message: '查询成功', data };
  }

  @Post('follow/team')
  async followTeam(@Request() req: any, @Body('team_id') teamId: number) {
    const data = await this.socialService.followTeam(Number(req.user.userId), Number(teamId));
    return { code: 200, message: '关注成功', data };
  }

  @Delete('follow/team')
  async unfollowTeam(@Request() req: any, @Query('team_id') teamId: number) {
    const data = await this.socialService.unfollowTeam(Number(req.user.userId), Number(teamId));
    return { code: 200, message: '取消关注成功', data };
  }

  @Get('follow/team/list')
  async listFollowedTeams(@Request() req: any) {
    const data = await this.socialService.listFollowedTeams(Number(req.user.userId));
    return { code: 200, message: '查询成功', data };
  }

  @Post('friends/request')
  async sendFriendRequest(@Request() req: any, @Body('receiver_id') receiverId: number) {
    const data = await this.socialService.sendFriendRequest(Number(req.user.userId), Number(receiverId));
    return { code: 200, message: '申请已发送', data };
  }

  @Get('friends/requests')
  async listFriendRequests(@Request() req: any) {
    const data = await this.socialService.listFriendRequests(Number(req.user.userId));
    return { code: 200, message: '查询成功', data };
  }

  @Post('friends/accept')
  async acceptFriendRequest(@Request() req: any, @Body('request_id') requestId: number) {
    const data = await this.socialService.acceptFriendRequest(Number(req.user.userId), Number(requestId));
    return { code: 200, message: '已同意', data };
  }

  @Post('friends/reject')
  async rejectFriendRequest(@Request() req: any, @Body('request_id') requestId: number) {
    const data = await this.socialService.rejectFriendRequest(Number(req.user.userId), Number(requestId));
    return { code: 200, message: '已拒绝', data };
  }

  @Get('friends/list')
  async listFriends(@Request() req: any) {
    const data = await this.socialService.listFriends(Number(req.user.userId));
    return { code: 200, message: '查询成功', data };
  }
}
