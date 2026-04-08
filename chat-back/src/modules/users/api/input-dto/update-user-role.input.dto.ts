import { IsEnum } from 'class-validator';
import { UserRole } from '../../domain/user-role.enum';

export class UpdateUserRoleInputDto {
  @IsEnum(UserRole)
  role: UserRole;
}

