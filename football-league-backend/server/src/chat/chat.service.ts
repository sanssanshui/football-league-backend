import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, ChatMessageStatus, ChatMessageType, ChatRoomType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { MuteUserDto } from './dto/mute-user.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLimit(limit = 30) {
    if (!Number.isFinite(limit)) return 30;
    return Math.min(Math.max(Math.trunc(limit), 1), 100);
  }

  async getRooms() {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { status: 'active' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return rooms.map((room) => this.mapRoom(room));
  }

  async getRoomByMatchId(matchId: number) {
    if (!Number.isInteger(matchId) || matchId <= 0) {
      throw new BadRequestException('matchId 参数无效');
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { match_id: matchId },
    });

    if (room) return room;

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { home_team: true, away_team: true },
    });

    if (!match) {
      throw new BadRequestException('比赛不存在');
    }

    return this.createRoom({
      match_id: matchId,
      name: `${match.home_team?.name || '主队'} vs ${match.away_team?.name || '客队'}`,
      type: 'match',
    });
  }

  private mapRoomType(type?: CreateRoomDto['type']): ChatRoomType {
    switch (type) {
      case 'team':
        return ChatRoomType.TEAM;
      case 'global':
        return ChatRoomType.GLOBAL;
      default:
        return ChatRoomType.MATCH;
    }
  }

  private mapMessageType(type?: CreateMessageDto['type']): ChatMessageType {
    switch (type) {
      case 'system':
        return ChatMessageType.SYSTEM;
      case 'event':
        return ChatMessageType.EVENT;
      case 'image':
        return ChatMessageType.IMAGE;
      default:
        return ChatMessageType.TEXT;
    }
  }

  private mapRoom(room: { id: number; match_id: number | null; name: string; type: ChatRoomType; status: string; online_count: number; updatedAt: Date; messages?: { createdAt: Date }[] }) {
    return {
      id: room.id,
      match_id: room.match_id,
      name: room.name,
      type: room.type.toLowerCase(),
      status: room.status,
      online_count: room.online_count,
      last_message_at: room.messages?.[0]?.createdAt ?? room.updatedAt,
    };
  }

  async createRoom(dto: CreateRoomDto) {
    if (!Number.isInteger(dto.match_id) || dto.match_id <= 0) {
      throw new BadRequestException('match_id 参数无效');
    }

    if (!dto.name?.trim()) {
      throw new BadRequestException('name 参数无效');
    }

    const type = this.mapRoomType(dto.type);

    return this.prisma.chatRoom.upsert({
      where: { match_id: dto.match_id },
      update: {
        name: dto.name.trim(),
        type,
        status: 'active',
      },
      create: {
        match_id: dto.match_id,
        name: dto.name.trim(),
        type,
        status: 'active',
      },
    });
  }

  async getMessages(roomId: number, cursor?: number, limit = 30) {
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new BadRequestException('roomId 参数无效');
    }

    const take = this.normalizeLimit(limit);
    const messages = await this.prisma.chatMessage.findMany({
      where: { room_id: roomId, status: ChatMessageStatus.NORMAL },
      orderBy: { id: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: { id: true, username: true, avatar_url: true },
        },
      },
    });

    return {
      items: messages.reverse().map((item) => ({
        id: item.id,
        room_id: item.room_id,
        user_id: item.user_id,
        username: item.user.username,
        avatar_url: item.user.avatar_url,
        type: item.type,
        content: item.content,
        reply_to: item.reply_to,
        created_at: item.createdAt,
      })),
      next_cursor: messages.length > 0 ? messages[0].id : null,
    };
  }

  async sendMessage(currentUserId: number, roomId: number, dto: CreateMessageDto) {
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new BadRequestException('roomId 参数无效');
    }

    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('消息内容不能为空');
    }

    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== 'active') {
      throw new BadRequestException('聊天室不存在或已关闭');
    }

    const mute = await this.prisma.chatMute.findFirst({
      where: {
        user_id: currentUserId,
        OR: [{ room_id: roomId }, { room_id: null }],
        mute_until: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (mute) {
      throw new BadRequestException('你已被禁言');
    }

    if (dto.replyTo) {
      const replyMessage = await this.prisma.chatMessage.findFirst({
        where: { id: dto.replyTo, room_id: roomId },
      });
      if (!replyMessage) {
        throw new BadRequestException('回复的消息不存在');
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        room_id: roomId,
        user_id: currentUserId,
        type: this.mapMessageType(dto.type),
        content,
        reply_to: dto.replyTo ?? null,
        status: ChatMessageStatus.NORMAL,
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async deleteMessage(currentUserId: number, messageId: number) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new BadRequestException('消息不存在');
    }

    if (message.user_id !== currentUserId) {
      throw new BadRequestException('只能删除自己的消息');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { status: ChatMessageStatus.DELETED },
    });
  }

  async reportMessage(currentUserId: number, messageId: number, dto: ReportMessageDto) {
    if (!Number.isInteger(messageId) || messageId <= 0) {
      throw new BadRequestException('messageId 参数无效');
    }

    if (!dto.reason?.trim()) {
      throw new BadRequestException('举报原因不能为空');
    }

    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new BadRequestException('消息不存在');
    }

    return this.prisma.chatReport.create({
      data: {
        message_id: messageId,
        reporter_id: currentUserId,
        reason: dto.reason.trim(),
        status: 'PENDING',
      },
    });
  }

  async muteUser(userId: number, dto: MuteUserDto) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('userId 参数无效');
    }

    if (!Number.isInteger(dto.mute_minutes) || dto.mute_minutes <= 0) {
      throw new BadRequestException('mute_minutes 参数无效');
    }

    const muteUntil = new Date(Date.now() + dto.mute_minutes * 60 * 1000);
    return this.prisma.chatMute.create({
      data: {
        user_id: userId,
        room_id: dto.room_id ?? null,
        mute_until: muteUntil,
        reason: dto.reason?.trim() || null,
      },
    });
  }

  async getOnlineCount(roomId: number) {
    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new BadRequestException('roomId 参数无效');
    }

    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new BadRequestException('聊天室不存在');
    }

    return { room_id: roomId, online_count: room.online_count };
  }
}
