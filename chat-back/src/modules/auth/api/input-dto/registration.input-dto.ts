import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { IsStringWithTrim } from '../../../../core/decorators/is-string-with-trim';

export class RegistrationInputDto {
  @IsStringWithTrim(1, 255)
  name: string;

  @IsStringWithTrim(1, 255)
  lastName: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  age: number;

  @IsString()
  @Length(6, 20)
  password: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsStringWithTrim(1, 255)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;
}
