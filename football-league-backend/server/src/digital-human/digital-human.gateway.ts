import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection,
  OnGatewayDisconnect, ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DigitalHumanService } from './digital-human.service';

interface StreamingCallbacks {
  onChunk?: (username: string, chunk: string) => void;
  onDone?: (username: string, fullText: string) => void;
  onError?: (username: string, error: string) => void;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/dh',
})
export class DigitalHumanGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DigitalHumanGateway.name);
  private userSockets = new Map<string, Set<string>>(); // username -> socketIds

  constructor(private readonly dhService: DigitalHumanService) {}

  handleConnection(client: Socket) {
    this.logger.log(`DH client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`DH client disconnected: ${client.id}`);
    // Remove from tracking
    for (const [username, sockets] of this.userSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(username);
    }
  }

  @SubscribeMessage('register')
  handleRegister(@ConnectedSocket() client: Socket, @MessageBody() data: { username: string }) {
    const { username } = data;
    if (!username) return;

    if (!this.userSockets.has(username)) {
      this.userSockets.set(username, new Set());
    }
    this.userSockets.get(username)!.add(client.id);

    // Join a personal room for this user
    client.join(`user:${username}`);
    this.logger.log(`User ${username} registered on DH socket (socket: ${client.id})`);
    return { status: 'registered', username };
  }

  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; username: string },
  ) {
    const { text, username } = data;
    if (!text?.trim() || !username) {
      client.emit('error', { message: 'text and username are required' });
      return;
    }

    this.logger.log(`DH Chat from ${username}: ${text.substring(0, 50)}...`);

    try {
      // Call Fay via SSE streaming proxy using injected httpService
      const axiosRef = (this.dhService as any).httpService.axiosRef;

      const response = await axiosRef.post(
        `${process.env.DIGITAL_HUMAN_URL || 'http://127.0.0.1:5100'}/api/dh/chat`,
        { text, username },
        { responseType: 'stream', timeout: 120000,
          headers: { Accept: 'text/event-stream' } },
      );

      // Read SSE stream from Fay and forward to Socket.IO room
      let buffer = '';
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'TEXT') {
                this.server.to(`user:${username}`).emit('textChunk', { content: event.content });
              } else if (event.type === 'THINK') {
                this.server.to(`user:${username}`).emit('thinkChunk', { content: event.content });
              } else if (event.type === 'DONE') {
                this.server.to(`user:${username}`).emit('done', { fullText: event.fullText });
              } else if (event.type === 'ERROR') {
                this.server.to(`user:${username}`).emit('error', { message: event.content });
              }
            } catch {
              // Skip parse errors for incomplete SSE data
            }
          }
        }
      });

      response.data.on('end', () => {
        this.server.to(`user:${username}`).emit('done', { fullText: '' });
      });

      response.data.on('error', (err: Error) => {
        this.logger.error(`DH stream error: ${err.message}`);
        this.server.to(`user:${username}`).emit('error', { message: err.message });
      });

    } catch (err: any) {
      this.logger.error(`DH chat error: ${err.message}`);
      this.server.to(`user:${username}`).emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('stop')
  async handleStop(@MessageBody() data: { username: string }) {
    if (!data.username) return;
    await this.dhService.stopGeneration(data.username);
    this.server.to(`user:${data.username}`).emit('stopped', { username: data.username });
  }
}
