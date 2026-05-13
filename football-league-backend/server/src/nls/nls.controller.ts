import { Controller, Post, Body, Res } from "@nestjs/common";
import type { Response } from "express";
import { NlsService } from "./nls.service";

@Controller("api/nls")
export class NlsController {
  constructor(private readonly nlsService: NlsService) {}

  @Post("tts")
  async tts(@Body() body: { text: string }, @Res() res: Response) {
    try {
      const audioBuffer = await this.nlsService.synthesize(body.text || "");
      res.setHeader("Content-Type", "audio/mp3");
      res.setHeader("Content-Length", audioBuffer.length);
      res.send(audioBuffer);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
