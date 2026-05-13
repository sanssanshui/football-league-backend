import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    // Authenticate in middleware so client.data is ready before any event fires
    server.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      this.logger.log(`[Auth] Received token: ${token ? token.substring(0, 20) + '...' : 'null'}`);
      if (!token) {
        this.logger.warn('[Auth] No token provided');
        next(new Error('No token provided'));
        return;
      }
      try {
        const payload = await this.jwtService.verifyAsync(token);
        this.logger.log(`[Auth] Token verified for user: ${payload.username} (${payload.userId})`);
        socket.data.userId = payload.userId;
        socket.data.username = payload.username;
        const user = await this.chatService.getUserById(payload.userId);
        socket.data.avatar_url = user?.avatar_url;
        next();
      } catch (error) {
        this.logger.error(`[Auth] Token verification failed:`, error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  async handleConnection(client: Socket) {
    if (!client.data.userId) {
      client.disconnect();
      return;
    }
    this.logger.log(`Client ${client.id} connected as user ${client.data.username} (${client.data.userId})`);
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`Client ${client.id} disconnected (user ${client.data.userId})`);
      await this.chatService.handleUserDisconnect(client.data.userId);

      // Notify all rooms about updated online counts
      const rooms = await this.chatService.getUserRooms(client.data.userId);
      for (const room of rooms) {
        const count = await this.chatService.getOnlineCount(room.room_id);
        this.server.to(`room:${room.room_id}`).emit('onlineCount', { roomId: room.room_id, count });
      }
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const { roomId } = data;
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Join room in database
      await this.chatService.joinRoom(userId, roomId);

      // Join Socket.IO room
      client.join(`room:${roomId}`);

      // Notify room about new user
      this.server.to(`room:${roomId}`).emit('userJoined', {
        userId,
        username: client.data.username,
        avatar_url: client.data.avatar_url,
      });

      // Send updated online count
      const count = await this.chatService.getOnlineCount(roomId);
      this.server.to(`room:${roomId}`).emit('onlineCount', { roomId, count });

      this.logger.log(`User ${userId} joined room ${roomId}`);

      return { success: true, roomId, onlineCount: count };
    } catch (error) {
      this.logger.error(`Error joining room:`, error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const { roomId } = data;
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Leave room in database
      await this.chatService.leaveRoom(userId, roomId);

      // Leave Socket.IO room
      client.leave(`room:${roomId}`);

      // Send updated online count
      const count = await this.chatService.getOnlineCount(roomId);
      this.server.to(`room:${roomId}`).emit('onlineCount', { roomId, count });

      this.logger.log(`User ${userId} left room ${roomId}`);

      return { success: true, roomId, onlineCount: count };
    } catch (error) {
      this.logger.error(`Error leaving room:`, error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      roomId: number;
      type: 'TEXT' | 'IMAGE' | 'FILE' | 'EMOJI';
      content: string;
      replyTo?: number;
    },
  ) {
    try {
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Create message in database
      const message = await this.chatService.createMessage({
        room_id: payload.roomId,
        user_id: userId,
        type: payload.type,
        content: payload.content,
        reply_to: payload.replyTo,
      });

      // Broadcast to room with the same shape as the REST getMessages response
      this.server.to(`room:${payload.roomId}`).emit('newMessage', {
        id: message.id,
        room_id: message.room_id,
        user_id: message.user_id,
        username: client.data.username,
        avatar_url: client.data.avatar_url,
        type: message.type,
        content: message.content,
        reply_to: message.reply_to,
        created_at: message.createdAt,
      });

      this.logger.log(`User ${userId} sent message to room ${payload.roomId}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message:`, error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('subscribeRoom')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const { roomId } = data;
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      await this.chatService.subscribeRoom(userId, roomId);
      const count = await this.chatService.getSubscriberCount(roomId);

      this.server.to(`room:${roomId}`).emit('subscriberCount', { roomId, count });

      this.logger.log(`User ${userId} subscribed to room ${roomId}`);

      return { success: true, roomId, subscriberCount: count };
    } catch (error) {
      this.logger.error(`Error subscribing to room:`, error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('unsubscribeRoom')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const { roomId } = data;
      const userId = client.data.userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      await this.chatService.unsubscribeRoom(userId, roomId);
      const count = await this.chatService.getSubscriberCount(roomId);

      this.server.to(`room:${roomId}`).emit('subscriberCount', { roomId, count });

      this.logger.log(`User ${userId} unsubscribed from room ${roomId}`);

      return { success: true, roomId, subscriberCount: count };
    } catch (error) {
      this.logger.error(`Error unsubscribing from room:`, error);
      return { success: false, error: error.message };
    }
  }
}
