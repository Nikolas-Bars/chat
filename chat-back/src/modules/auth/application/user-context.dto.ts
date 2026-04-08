import { UserRole } from '../../users/domain/user-role.enum';

export class UserContextDto {
  userId: string;
  login: string;
  email: string;
  role: UserRole;
}
