import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { AiService } from "./ai.service";
import { ChatRequestDto } from "./dto/chat-request.dto";

@Controller("ai")
export class AiController {
    constructor(private readonly aiService: AiService) {}

    // 对应原Java的 /ai/chat 接口，和前端完全兼容
    @Post("chat")
    async chat(@Body() body: ChatRequestDto) {
        const { question } = body;
        if (!question || question.trim().length === 0) {
            throw new BadRequestException("问题内容不能为空");
        }

        try {
            const answer = await this.aiService.chat(question);
            return { answer };
        } catch (error) {
            return { message: error.message || "服务器内部错误" };
        }
    }
}