import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailExternalService } from '../../email/application/email-external.service';
import { JwtService } from '@nestjs/jwt';
import { addHours } from 'date-fns';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '../dto/register.user.dto';
import { UsersExternalService } from '../../users/application/users-external.service';
import { LoginInputDto } from '../api/input-dto/login.input.dto';
import { UserContextDto } from './user-context.dto';
import { UserRole } from '../../users/domain/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly emailExternalService: EmailExternalService,
    private readonly jwtService: JwtService,
    private readonly usersExternalService: UsersExternalService,
  ) {}

  async registerUser(body: RegisterUserDto): Promise<boolean> {
    const passwordHash = await bcrypt.hash(body.password, 10);
    const confirmationCode = randomUUID();
    const expirationDate = addHours(new Date(), 1);

    await this.usersExternalService.createUnconfirmedUser({
      name: body.name,
      lastName: body.lastName,
      age: body.age,
      password: passwordHash,
      email: body.email,
      phone: body.phone,
      jobTitle: body.jobTitle,
      company: body.company,
      emailConfirmationCode: confirmationCode,
      emailConfirmationExpiresAt: expirationDate,
    });

    // return this.emailExternalService.sendEmailConfirmationMassage({
    //   path: body.email,
    //   msg: '',
    //   subject: 'Подтверждение регистрации',
    //   code: confirmationCode,
    // });
    // Временно отключаем подтверждение по email:
    // - не отправляем письмо
    // - сразу подтверждаем email, чтобы логин работал
    const user = await this.usersExternalService.findByEmail(body.email);
    if (user) {
      user.isEmailConfirmed = true;
      user.emailConfirmationCode = null;
      user.emailConfirmationExpiresAt = null;
      await this.usersExternalService.save(user);
    }

    return true;
  }

  async login(
    userId: string,
    email: string,
    login: string,
    role: UserRole,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, login, role },
      {
        expiresIn: '15m',
        secret: process.env.JWT_ACCESS_SECRET || 'secret',
      },
    );

    const refreshToken = this.jwtService.sign(
      { userId, deviceId: randomUUID() },
      {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async confirmCode(code: string): Promise<void> {
    const user = await this.usersExternalService.findByConfirmationCode(code);
    if (!user) {
      throw new BadRequestException('Invalid confirmation code');
    }
    if (user.isEmailConfirmed) {
      throw new BadRequestException('Email already confirmed');
    }
    if (
      !user.emailConfirmationExpiresAt ||
      user.emailConfirmationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Confirmation code expired');
    }

    user.isEmailConfirmed = true;
    user.emailConfirmationCode = null;
    user.emailConfirmationExpiresAt = null;
    await this.usersExternalService.save(user);
  }

  // Нужен для LocalStrategy, чтобы проект компилировался и логин можно было включить позже.
  async validateUser(data: LoginInputDto): Promise<UserContextDto | null> {
    const user = await this.usersExternalService.findByEmailOrPhone(
      data.loginOrEmail,
    );
    if (!user || !user.isEmailConfirmed) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return {
      userId: String(user.id),
      login: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
