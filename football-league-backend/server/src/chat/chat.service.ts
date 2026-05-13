import { BadRequestException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ChatMessageStatus, ChatMessageType, ChatRoomType, ChatReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { MuteUserDto } from './dto/mute-user.dto';

@Injectable()
export class ChatService implements OnApplicationBootstrap {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.initRoomsForAllMatches();
    } catch {
      // non-fatal
    }
  }

  private normalizeLimit(limit = 30) {
    if (!Number.isFinite(limit)) return 30;
    return Math.min(Math.max(Math.trunc(limit), 1), 100);
  }

  async getRooms(currentUserId?: number) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        OR: [
          // Match rooms: only 2026 Jiangsu Super League matches
          {
            type: ChatRoomType.MATCH,
            match: {
              match_time: {
                gte: new Date('2026-01-01T00:00:00Z'),
                lt: new Date('2027-01-01T00:00:00Z'),
              },
            },
          },
          // Global/team rooms always included
          { type: { in: [ChatRoomType.GLOBAL, ChatRoomType.TEAM] } },
        ],
      },
      orderBy: [
        { match: { match_time: 'asc' } },
        { updatedAt: 'desc' },
      ],
      include: {
        match: {
          include: {
            home_team: { select: { id: true, name: true } },
            away_team: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const subscriberCount = await this.getSubscriberCount(room.id);
        let isSubscribed = false;
        if (currentUserId) {
          const member = await this.prisma.chatRoomMember.findUnique({
            where: { uk_chat_room_member: { room_id: room.id, user_id: currentUserId } },
            select: { subscribed: true },
          });
          isSubscribed = member?.subscribed ?? false;
        }
        return {
          ...this.mapRoom(room),
          match: room.match ? {
            id: room.match.id,
            status: room.match.status,
            match_time: room.match.match_time,
            home_team: room.match.home_team,
            away_team: room.match.away_team,
            home_score: room.match.home_score,
            away_score: room.match.away_score,
          } : null,
          subscriberCount,
          isSubscribed,
        };
      }),
    );

    return roomsWithCounts;
  }

  async isSubscribed(userId: number, roomId: number): Promise<boolean> {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { uk_chat_room_member: { room_id: roomId, user_id: userId } },
      select: { subscribed: true },
    });
    return member?.subscribed ?? false;
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

  // 🔧 修复：兼容string入参，覆盖schema里所有枚举值
  private mapMessageType(type?: string | CreateMessageDto['type']): ChatMessageType {
    switch (type?.toLowerCase()) {
      case 'system':
        return ChatMessageType.SYSTEM;
      case 'event':
        return ChatMessageType.EVENT;
      case 'image':
        return ChatMessageType.IMAGE;
      case 'file':
        return ChatMessageType.FILE;
      case 'emoji':
        return ChatMessageType.EMOJI;
      default:
        return ChatMessageType.TEXT;
    }
  }

  private mapRoom(room: { id: number; match_id: number | null; name: string; type: ChatRoomType; status: string; online_count: number; createdAt: Date; updatedAt: Date; messages?: { createdAt: Date }[] }) {
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

    // 🔧 修复：使用枚举替代硬编码字符串
    return this.prisma.chatReport.create({
      data: {
        message_id: messageId,
        reporter_id: currentUserId,
        reason: dto.reason.trim(),
        status: ChatReportStatus.PENDING,
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

  // ==================== WebSocket 相关方法 ====================

  async createMessage(data: {
    room_id: number;
    user_id: number;
    type: string;
    content: string;
    reply_to?: number;
  }) {
    const content = data.content?.trim();
    if (!content) {
      throw new BadRequestException('消息内容不能为空');
    }

    const room = await this.prisma.chatRoom.findUnique({ where: { id: data.room_id } });
    if (!room) {
      throw new BadRequestException('聊天室不存在');
    }

    if (room.status === 'closed') {
      throw new BadRequestException('聊天室已关闭');
    }

    const mute = await this.prisma.chatMute.findFirst({
      where: {
        user_id: data.user_id,
        OR: [{ room_id: data.room_id }, { room_id: null }],
        mute_until: { gt: new Date() },
      },
    });

    if (mute) {
      throw new BadRequestException('您已被禁言');
    }

    return this.prisma.chatMessage.create({
      data: {
        room_id: data.room_id,
        user_id: data.user_id,
        type: this.mapMessageType(data.type),
        content,
        reply_to: data.reply_to ?? null,
        status: ChatMessageStatus.NORMAL,
      },
      include: {
        user: { select: { id: true, username: true, avatar_url: true } },
      },
    });
  }

  async getUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, avatar_url: true },
    });
  }

  async getUserRooms(userId: number) {
    return this.prisma.chatRoomMember.findMany({
      where: { user_id: userId, status: 'ONLINE' },
      select: { room_id: true },
    });
  }

  async joinRoom(userId: number, roomId: number) {
    await this.prisma.chatRoomMember.upsert({
      where: { uk_chat_room_member: { room_id: roomId, user_id: userId } },
      create: { room_id: roomId, user_id: userId, status: 'ONLINE' },
      update: { status: 'ONLINE', lastActiveAt: new Date() },
    });
    await this.updateOnlineCount(roomId);
  }

  async leaveRoom(userId: number, roomId: number) {
    await this.prisma.chatRoomMember.updateMany({
      where: { room_id: roomId, user_id: userId },
      data: { status: 'OFFLINE' },
    });
    await this.updateOnlineCount(roomId);
  }

  async handleUserDisconnect(userId: number) {
    await this.prisma.chatRoomMember.updateMany({
      where: { user_id: userId, status: 'ONLINE' },
      data: { status: 'OFFLINE' },
    });
  }

  private async updateOnlineCount(roomId: number) {
    const count = await this.prisma.chatRoomMember.count({
      where: { room_id: roomId, status: 'ONLINE' },
    });
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { online_count: count },
    });
  }

  async subscribeRoom(userId: number, roomId: number) {
    await this.prisma.chatRoomMember.upsert({
      where: { uk_chat_room_member: { room_id: roomId, user_id: userId } },
      create: { room_id: roomId, user_id: userId, subscribed: true, status: 'OFFLINE' },
      update: { subscribed: true },
    });
  }

  async unsubscribeRoom(userId: number, roomId: number) {
    await this.prisma.chatRoomMember.updateMany({
      where: { room_id: roomId, user_id: userId },
      data: { subscribed: false },
    });
  }

  async getSubscriberCount(roomId: number) {
    return this.prisma.chatRoomMember.count({
      where: { room_id: roomId, subscribed: true },
    });
  }

  async initRoomsForAllMatches() {
    const matches = await this.prisma.match.findMany({
      where: { chatRooms: { none: {} } },
      include: { home_team: true, away_team: true },
    });

    for (const match of matches) {
      try {
        await this.prisma.chatRoom.create({
          data: {
            match_id: match.id,
            name: `${match.home_team?.name ?? '主队'} vs ${match.away_team?.name ?? '客队'}`,
            type: ChatRoomType.MATCH,
            status: match.status === 1 ? 'active' : match.status === 2 ? 'closed' : 'upcoming',
          },
        });
      } catch {
        // skip duplicates
      }
    }

    return { created: matches.length };
  }

  async updateRoomStatusByMatch(matchId: number, matchStatus: number) {
    const statusMap: Record<number, string> = { 0: 'upcoming', 1: 'active', 2: 'closed' };
    const newStatus = statusMap[matchStatus];
    if (!newStatus) return;

    await this.prisma.chatRoom.updateMany({
      where: { match_id: matchId },
      data: { status: newStatus },
    });
  }
}