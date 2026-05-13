import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { AiService } from "./ai.service";
import { ChatRequestDto } from "./dto/chat-request.dto";

@Controller("ai")
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Post("chat")
    async chat(@Body() body: ChatRequestDto) {
        const { question, imageUrls } = body;

        const hasText = question && question.trim().length > 0;
        const hasImages = imageUrls && imageUrls.length > 0;

        if (!hasText && !hasImages) {
            throw new BadRequestException("请输入问题或上传图片");
        }

        try {
            const answer = await this.aiService.chat(question || "", imageUrls);
            return { answer };
        } catch (error: any) {
            console.error("AI聊天接口错误：", error);
            return {
                answer: `抱歉，AI服务暂时不可用：${error?.message || "未知错误"}`,
            };
        }
    }
}
