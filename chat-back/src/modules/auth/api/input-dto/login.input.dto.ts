import { IsString, Length } from 'class-validator';

export class LoginInputDto {
  @IsString({ message: 'loginOrEmail must be a string' })
  loginOrEmail: string;

  @IsString({ message: 'password must be a string' })
  password: string;
}
