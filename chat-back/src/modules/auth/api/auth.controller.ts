import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../application/auth.service';
import { RegistrationInputDto } from './input-dto/registration.input-dto';
import { RegistrationUserPipe } from './pipes/registration.user.pipe';
import { LoginInputDto } from './input-dto/login.input.dto';
import { ConfirmationEmailInputDto } from '../dto/confirmation.email.input.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UsePipes(RegistrationUserPipe)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('/registration')
  async registration(@Body() body: RegistrationInputDto): Promise<void> {
    const res = await this.authService.registerUser(body);

    if (!res) {
      throw new BadRequestException('Something went wrong');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginInputDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.authService.login(
      user.userId,
      user.email,
      user.login,
    );

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    const secure = process.env.NODE_ENV === 'production';
    const cookieOpts = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('registration-confirmation')
  async confirmationCode(@Body() body: ConfirmationEmailInputDto): Promise<void> {
    await this.authService.confirmCode(body.code);
  }

  // @HttpCode(204)
  // @Post("/password-recovery")
  // @Throttle({ default: { limit: 5, ttl: 10000 } })
  // @UseGuards(ThrottlerGuard)
  // async recoveryPassword(@Body() body: RecoveryInputDto) {
  //   // ValidationPipe автоматически проверит email (400 если невалидный)
  //   // Throttle ограничит до 5 попыток за 10 секунд (429 если превышен)
  //   // Всегда возвращает 204, даже если email не зарегистрирован (для безопасности)
  //   await this.authService.passwordRecovery(body.email);
  // }
  //
  // @HttpCode(204)
  // @Post("/new-password")
  // @Throttle({ default: { limit: 5, ttl: 10000 } })
  // @UseGuards(ThrottlerGuard)
  // async newPassword(@Body() body: NewPasswordInputDto) {
  //   await this.authService.checkRecoveryCode(body.recoveryCode, body.newPassword);
  // }
  //
  // @HttpCode(204)
  // @Post("/registration-email-resending")
  // @Throttle({ default: { limit: 5, ttl: 10000 } })
  // @UseGuards(ThrottlerGuard)
  // async resendRegistrationEmail(@Body() body: ResendEmailInputDto) {
  //   await this.authService.resendConfirmationCode(body.email);
  // }
  //
  // @Get('me')
  // @Throttle({ default: { limit: 5, ttl: 10000 } })
  // @UseGuards(ThrottlerGuard, JwtAuthGuard)
  // // ThrottlerGuard проверяет ограничение (4 запроса за 10 секунд)
  // // JwtAuthGuard проверяет JWT-токен из запроса.
  // // Если токен валиден, JwtStrategy декодирует его и добавляет данные пользователя в request.user.
  // async getMe(@ExtractUserFromRequest() user: UserContextDto) {
  //   return {
  //       userId: user.userId,
  //       login: user.login,
  //       email: user.email,
  //   };
  // }
}
