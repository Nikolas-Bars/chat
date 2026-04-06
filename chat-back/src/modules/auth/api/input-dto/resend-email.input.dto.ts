import { IsEmail, IsString, Length } from 'class-validator';

export class ResendEmailInputDto {
  @IsEmail()
  email: string;
}
