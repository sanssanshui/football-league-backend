import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AiService {
    // 多模态接口（支持图文混合输入）
    private readonly API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
    private readonly MODEL = "qwen-vl-max";
    private readonly SYSTEM_PROMPT = `你是专业的足球赛事AI助手，专注于足球赛事、球队球员、比赛规则、足球历史、战术分析相关的知识解答。
1. 仅回答和足球赛事、球队、球员、足球规则、战术相关的问题，无关问题请礼貌拒绝，引导用户提问足球相关内容。
2. 如果用户发送了图片，请分析图片内容并结合足球知识进行解答（如战术板、球员照片、赛事截图、比分截图等）。
3. 回答通俗易懂、专业准确，简洁明了不超过300字，除非用户要求详细讲解。`;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    async chat(userQuestion: string, imageUrls?: string[]): Promise<string> {
        const apiKey = this.configService.get<string>("DASHSCOPE_API_KEY");
        if (!apiKey) {
            throw new InternalServerErrorException("AI服务配置异常，缺少API Key");
        }

        // 构建用户消息内容（支持图文混合）
        const userContent: any[] = [];

        // 先添加图片
        if (imageUrls && imageUrls.length > 0) {
            for (const url of imageUrls) {
                userContent.push({ image: url });
            }
        }

        // 再添加文字（纯图片时给默认提示）
        userContent.push({ text: userQuestion.trim() || "请分析这张图片" });

        const requestBody = {
            model: this.MODEL,
            input: {
                messages: [
                    {
                        role: "system",
                        content: [{ text: this.SYSTEM_PROMPT }]
                    },
                    {
                        role: "user",
                        content: userContent
                    }
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
                    },
                    timeout: 30000
                })
            );

            const choices = response.data?.output?.choices;
            if (!choices || choices.length === 0) {
                throw new InternalServerErrorException("AI返回内容异常");
            }

            const content = choices[0].message.content;
            // qwen-vl-max 返回的 content 可能是数组格式
            if (Array.isArray(content)) {
                return content.map((c: any) => c.text || "").join("");
            }
            return content;
        } catch (error: any) {
            const errData = error?.response?.data;
            console.error("通义千问API调用失败：", errData || error?.message);
            throw new InternalServerErrorException(
                errData?.message || "AI服务请求失败，请稍后重试"
            );
        }
    }
}
