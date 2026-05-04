export type CreateMessageType = 'text' | 'system' | 'event' | 'image';

export class CreateMessageDto {
  type!: CreateMessageType;
  content!: string;
  replyTo?: number;
}
