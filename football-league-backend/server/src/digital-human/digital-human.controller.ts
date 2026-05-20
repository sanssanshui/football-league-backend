import {
  Controller, Post, Get, Put, Body, Req, Res, HttpCode,
  UseGuards, Logger, HttpException, HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DigitalHumanService } from './digital-human.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/digital-human')
export class DigitalHumanController {
  private readonly logger = new Logger(DigitalHumanController.name);

  constructor(private readonly dhService: DigitalHumanService) {}

  @Get('health')
  async health() {
    const ok = await this.dhService.health();
    return { status: ok ? 'ok' : 'unavailable', fayAlive: ok };
  }

  @Post('chat')
  @HttpCode(200)
  async chat(
    @Body() body: { text: string; username?: string },
    @Req() req: Request,
  ) {
    const { text, username } = body;
    if (!text?.trim()) {
      throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
    }
    const user = (req as any).user?.username || username || 'User';
    this.logger.log(`Chat request from ${user}: ${text.substring(0, 50)}...`);
    const result = await this.dhService.chat(text.trim(), user);
    return { answer: result.fullText };
  }

  @Post('chat/stream')
  async chatStream(
    @Body() body: { text: string; username?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { text, username } = body;
    if (!text?.trim()) {
      throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
    }
    const user = (req as any).user?.username || username || 'User';
    this.logger.log(`Stream chat from ${user}: ${text.substring(0, 50)}...`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const fayUrl = process.env.DIGITAL_HUMAN_URL || 'http://127.0.0.1:5100';
      const axiosRef = (this.dhService as any).httpService.axiosRef;
      const response = await axiosRef.post(
        `${fayUrl}/api/dh/chat`,
        { text: text.trim(), username: user },
        { responseType: 'stream', timeout: 120000,
          headers: { Accept: 'text/event-stream' } },
      );

      // Pipe Fay SSE stream directly to client response
      response.data.on('data', (chunk: Buffer) => {
        res.write(chunk);
      });
      response.data.on('end', () => res.end());
      response.data.on('error', (err: Error) => {
        this.logger.error(`Stream proxy error: ${err.message}`);
        res.end();
      });
    } catch (err: any) {
      this.logger.error(`Stream error: ${err.message}`);
      res.write(`data: ${JSON.stringify({ type: 'ERROR', content: err.message })}\n\n`);
      res.end();
    }
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async tts(@Body() body: { text: string }, @Res() res: Response) {
    const { text } = body;
    if (!text?.trim()) {
      throw new HttpException('text is required', HttpStatus.BAD_REQUEST);
    }
    this.logger.log(`TTS request: ${text.substring(0, 50)}...`);
    const audioBuffer = await this.dhService.tts(text.trim());
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  }

  @Get('persona')
  async getPersona() {
    return this.dhService.getPersona();
  }

  @Put('persona')
  @UseGuards(JwtAuthGuard)
  async updatePersona(@Body() body: Record<string, any>) {
    return this.dhService.updatePersona(body);
  }

  @Post('stop')
  async stopGeneration(@Body() body: { username?: string }, @Req() req: Request) {
    const user = (req as any).user?.username || body.username || 'User';
    return this.dhService.stopGeneration(user);
  }
}
