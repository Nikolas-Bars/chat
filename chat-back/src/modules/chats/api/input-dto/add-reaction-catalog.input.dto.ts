import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddReactionCatalogInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  value: string;
}

