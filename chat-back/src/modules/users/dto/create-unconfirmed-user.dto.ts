export class CreateUnconfirmedUserDto {
  name: string;
  lastName: string;
  age: number;
  password: string;
  email: string;
  phone: string;
  jobTitle?: string;
  company?: string;
  emailConfirmationCode: string;
  emailConfirmationExpiresAt: Date;
}
