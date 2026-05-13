import { IsString, IsOptional, IsArray } from "class-validator";

export class ChatRequestDto {
    @IsString()
    @IsOptional()
    question?: string;

    @IsArray()
    @IsOptional()
    imageUrls?: string[];
}
