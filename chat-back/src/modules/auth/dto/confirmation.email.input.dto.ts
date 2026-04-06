import { IsString, IsUUID } from 'class-validator';

export class ConfirmationEmailInputDto {
  @IsString({ message: 'code must be a string' })
  @IsUUID('4', { message: 'code must be a valid UUID v4' })
  code: string;
}
