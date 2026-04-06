import { IsEmail, IsString, Length } from 'class-validator';

export class RecoveryInputDto {
  @IsEmail()
  email: string;
}
