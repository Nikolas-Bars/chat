export class RegisterUserDto {
  name: string;
  lastName: string;
  age: number;
  email: string;
  phone: string;
  password: string;
  jobTitle?: string;
  company?: string;
}
