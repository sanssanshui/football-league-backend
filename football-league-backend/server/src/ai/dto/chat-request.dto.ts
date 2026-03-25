import { IsString, IsNotEmpty } from "class-validator";

export class ChatRequestDto {
    @IsString()
    @IsNotEmpty({ message: "问题内容不能为空" })
    question: string;
}