import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

const FAY_BASE_URL = process.env.DIGITAL_HUMAN_URL || 'http://127.0.0.1:5100';

@Injectable()
export class DigitalHumanService {
  private readonly logger = new Logger(DigitalHumanService.name);

  constructor(private readonly httpService: HttpService) {}

  async health(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${FAY_BASE_URL}/api/dh/health`, { timeout: 3000 }),
      );
      return res.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  async chat(text: string, username: string): Promise<{ content: string; fullText: string }> {
    // Consume the SSE stream from Fay and return accumulated text
    const response = await this.httpService.axiosRef.post(
      `${FAY_BASE_URL}/api/dh/chat`,
      { text, username },
      { responseType: 'stream', timeout: 120000,
        headers: { Accept: 'text/event-stream' } },
    );

    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
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
                chunks.push(event.content);
              } else if (event.type === 'DONE') {
                const fullText = event.fullText || chunks.join('');
                resolve({ content: fullText, fullText });
              } else if (event.type === 'ERROR') {
                reject(new Error(event.content));
              }
            } catch { /* skip parse errors */ }
          }
        }
      });

      response.data.on('end', () => {
        const fullText = chunks.join('');
        resolve({ content: fullText, fullText });
      });

      response.data.on('error', (err: Error) => reject(err));
    });
  }

  async chatStream(text: string, username: string): Promise<Observable<AxiosResponse>> {
    const res = this.httpService.post(
      `${FAY_BASE_URL}/api/dh/chat`,
      { text, username },
      {
        responseType: 'stream',
        timeout: 120000,
        headers: { Accept: 'text/event-stream' },
      },
    );
    return res;
  }

  async tts(text: string): Promise<Buffer> {
    const res = await firstValueFrom(
      this.httpService.post(
        `${FAY_BASE_URL}/api/dh/tts`,
        { text },
        { responseType: 'arraybuffer', timeout: 30000 },
      ),
    );
    return Buffer.from(res.data);
  }

  async getPersona(): Promise<any> {
    const res = await firstValueFrom(
      this.httpService.get(`${FAY_BASE_URL}/api/dh/persona`, { timeout: 5000 }),
    );
    return res.data;
  }

  async updatePersona(data: Record<string, any>): Promise<any> {
    const res = await firstValueFrom(
      this.httpService.put(`${FAY_BASE_URL}/api/dh/persona`, data, { timeout: 5000 }),
    );
    return res.data;
  }

  async stopGeneration(username: string): Promise<any> {
    const res = await firstValueFrom(
      this.httpService.post(`${FAY_BASE_URL}/api/dh/stop`, { username }, { timeout: 5000 }),
    );
    return res.data;
  }

  async transparentPass(user: string, text?: string, audio?: string): Promise<any> {
    const res = await firstValueFrom(
      this.httpService.post(
        `${FAY_BASE_URL}/api/dh/transparent`,
        { user, text, audio },
        { timeout: 5000 },
      ),
    );
    return res.data;
  }
}
