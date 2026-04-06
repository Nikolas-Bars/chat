import { SendEmailType } from '../email.types';
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailExternalService {
  constructor() {}

  async sendMessage(msgData: SendEmailType): Promise<boolean> {
    try {
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465, // или 587 + secure: false
        secure: true,
        auth: {
          user: 'docum.magic0@gmail.com',
          pass: 'zsskjnikysdkmzhf',
        },
      });

      await transport.sendMail({
        from: '"Nikolas Bars" <docum.magic0@gmail.com>',
        to: msgData.path,
        subject: msgData.subject,
        html: msgData.msg,
      });

      return true;
    } catch (error) {
      console.error('Failed to send email', error);
      return false;
    }
  }

  async sendEmailConfirmationMassage(msgData: SendEmailType & { code: string }) {
    const base =
      process.env.PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'http://localhost:5173';
    const confirmUrl = `${base}/registration-confirmation?code=${encodeURIComponent(msgData.code)}`;
    const message = `<h1>Спасибо за регистрацию</h1><p><a href="${confirmUrl}">Подтвердить email</a></p><p>Если ссылка не открывается, скопируйте код: <code>${msgData.code}</code></p>`;

    return await this.sendMessage({ ...msgData, msg: message });

  }

  async sendRecoveryMail(
    email: string,
    subject: string,
    code: string,
  ): Promise<boolean> {
    const message = ` <h1>Password recovery</h1><a href=\'https://blog-t57v.onrender.com/password-recovery?recoveryCode=${code}\'>recovery password</a>`;

    return await this.sendMessage({ path: email, subject, msg: message });
  }
}
