import { IsInt, Min } from 'class-validator';

export class MarkChatReadInputDto {
  @IsInt()
  @Min(1)
  messageId: number;
}
