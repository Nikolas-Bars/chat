import { User } from '../domain/user.entity';

export class UserViewDto {
  id: number;
  name: string;
  lastName: string;
  age: number;
  email: string;
  phone: string;
  jobTitle: string | null;
  company: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User): UserViewDto {
    const dto = new UserViewDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.lastName = user.lastName;
    dto.age = user.age;
    dto.email = user.email;
    dto.phone = user.phone;
    dto.jobTitle = user.jobTitle;
    dto.company = user.company;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
