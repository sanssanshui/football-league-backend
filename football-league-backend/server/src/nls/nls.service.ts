import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class NlsService {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private config: ConfigService) {}

  async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60000) {
      return this.tokenCache.token;
    }

    const accessKeyId = this.config.get<string>("ALIBABA_ACCESS_KEY_ID");
    const accessKeySecret = this.config.get<string>("ALIBABA_ACCESS_KEY_SECRET");
    if (!accessKeyId || !accessKeySecret) {
      throw new Error("ALIBABA_ACCESS_KEY_ID or ALIBABA_ACCESS_KEY_SECRET not configured");
    }

    const url = "https://nls-meta.cn-shanghai.aliyuncs.com/pop/2018-05-18/tokens";
    const parsed = new URL(url);
    const now = new Date();
    const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
    const nonce = crypto.randomUUID();

    const params = `AccessKeyId=${encodeURIComponent(accessKeyId)}`
      + `&Action=CreateToken`
      + `&Format=JSON`
      + `&RegionId=cn-shanghai`
      + `&SignatureMethod=HMAC-SHA1`
      + `&SignatureNonce=${nonce}`
      + `&SignatureVersion=1.0`
      + `&Timestamp=${encodeURIComponent(timestamp)}`
      + `&Version=2018-05-18`;

    const stringToSign = `GET&${encodeURIComponent("/")}&${encodeURIComponent(params)}`;
    const signature = crypto
      .createHmac("sha1", `${accessKeySecret}&`)
      .update(stringToSign)
      .digest("base64");

    const signedUrl = `${url}?${params}&Signature=${encodeURIComponent(signature)}`;
    const response = await fetch(signedUrl);
    const data = await response.json();

    if (data.Token?.Id) {
      const expiresAt = data.Token.ExpireTime
        ? new Date(data.Token.ExpireTime).getTime()
        : Date.now() + 1700 * 1000;
      this.tokenCache = { token: data.Token.Id, expiresAt };
      return data.Token.Id;
    }
    throw new Error(data.Message || "Failed to get NLS token");
  }

  async synthesize(text: string): Promise<Buffer> {
    const token = await this.getToken();
    const appkey = this.config.get<string>("ALIBABA_NLS_APPKEY") || "";

    const body = JSON.stringify({
      appkey, token, text, format: "mp3", voice: "aixia",
      sample_rate: 16000, volume: 50, speech_rate: 0, pitch_rate: 0,
    });

    const response = await fetch(
      "https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-NLS-Token": token },
        body,
      }
    );

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
