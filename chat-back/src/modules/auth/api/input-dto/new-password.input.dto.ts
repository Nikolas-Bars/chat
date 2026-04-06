import { IsEmail, IsString, Length } from 'class-validator';

export class NewPasswordInputDto {
  @IsString()
  @Length(6, 20)
  newPassword: string;
  @IsString()
  recoveryCode: string;
}
