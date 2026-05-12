import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { MuteUserDto } from './dto/mute-user.dto';

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  async getRooms() {
    const data = await this.chatService.getRooms();
    return { code: 200, message: '查询成功', data };
  }

  @Get('rooms/by-match/:matchId')
  async getRoomByMatchId(@Param('matchId') matchId: string) {
    const data = await this.chatService.getRoomByMatchId(Number(matchId));
    return { code: 200, message: '查询成功', data };
  }

  @Post('rooms')
  async createRoom(@Body() dto: CreateRoomDto) {
    const data = await this.chatService.createRoom(dto);
    return { code: 200, message: '创建成功', data };
  }

  @Get('rooms/:roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.chatService.getMessages(
      Number(roomId),
      cursor ? Number(cursor) : undefined,
      limit ? Number(limit) : 30,
    );
    return { code: 200, message: '查询成功', data };
  }

  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: CreateMessageDto,
  ) {
    const data = await this.chatService.sendMessage(Number(req.user.userId), Number(roomId), dto);
    return { code: 200, message: '发送成功', data };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@Request() req: any, @Param('messageId') messageId: string) {
    const data = await this.chatService.deleteMessage(Number(req.user.userId), Number(messageId));
    return { code: 200, message: '删除成功', data };
  }

  @Post('messages/:messageId/report')
  async reportMessage(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: ReportMessageDto,
  ) {
    const data = await this.chatService.reportMessage(Number(req.user.userId), Number(messageId), dto);
    return { code: 200, message: '举报成功', data };
  }

  @Post('users/:userId/mute')
  async muteUser(@Param('userId') userId: string, @Body() dto: MuteUserDto) {
    const data = await this.chatService.muteUser(Number(userId), dto);
    return { code: 200, message: '禁言成功', data };
  }

  @Delete('users/:userId/mute')
  async unmuteUser(@Param('userId') userId: string, @Query('room_id') roomId?: string) {
    return { code: 200, message: '解除成功', data: { user_id: Number(userId), room_id: roomId ? Number(roomId) : null } };
  }

  @Get('rooms/:roomId/online')
  async getOnlineCount(@Param('roomId') roomId: string) {
    const data = await this.chatService.getOnlineCount(Number(roomId));
    return { code: 200, message: '查询成功', data };
  }
}
