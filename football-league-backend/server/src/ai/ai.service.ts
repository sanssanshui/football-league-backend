import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AiService {
    private readonly API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
    private readonly MODEL = "qwen-turbo";
    // 足球专属系统提示词（替换原古建内容）
    private readonly SYSTEM_PROMPT = `
            你是专业的足球赛事AI助手，专注于足球赛事、球队球员、比赛规则、足球历史、战术分析相关的知识解答。
            1. 仅回答和足球赛事、球队、球员、足球规则、战术相关的问题，无关问题请礼貌拒绝，引导用户提问足球相关内容。
            2. 回答通俗易懂、专业准确，贴合足球科普定位，简洁明了不超过300字，除非用户要求详细讲解。
    `;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    async chat(userQuestion: string): Promise<string> {
        const apiKey = this.configService.get<string>("DASHSCOPE_API_KEY");
        if (!apiKey) {
            throw new InternalServerErrorException("AI服务配置异常，缺少API Key");
        }

        const requestBody = {
            model: this.MODEL,
            input: {
                messages: [
                    { role: "system", content: this.SYSTEM_PROMPT },
                    { role: "user", content: userQuestion.trim() }
                ]
            },
            parameters: {
                result_format: "message",
                temperature: 0.7,
                top_p: 0.8,
                max_tokens: 1000
            }
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post(this.API_URL, requestBody, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                        "X-DashScope-SSE": "disable"
                    }
                })
            );

            const choices = response.data.output.choices;
            if (!choices || choices.length === 0) {
                throw new InternalServerErrorException("AI返回内容异常");
            }
            return choices[0].message.content;
        } catch (error) {
            console.error("通义千问API调用失败：", error);
            throw new InternalServerErrorException("AI服务请求失败，请稍后重试");
        }
    }
}