import { SendEmailType } from '../email.types';
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** На Render исходящие SMTP (465/587) часто блокируются — используй HTTPS API (Resend). */
@Injectable()
export class EmailExternalService {
  constructor() {}

  private async sendViaResend(msgData: SendEmailType): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return false;
    }
    const from =
      process.env.RESEND_FROM?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [msgData.path],
        subject: msgData.subject,
        html: msgData.msg,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Resend API error', res.status, text);
      return false;
    }
    return true;
  }

  private createTransport(): Transporter | null {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      return null;
    }
    const port = Number(process.env.SMTP_PORT ?? 465);
    const secure = process.env.SMTP_SECURE !== 'false';
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendMessage(msgData: SendEmailType): Promise<boolean> {
    try {
      if (process.env.RESEND_API_KEY?.trim()) {
        return await this.sendViaResend(msgData);
      }

      const transport = this.createTransport();
      if (!transport) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[email] SMTP не задан — письмо не ушло (режим разработки). Получатель:',
            msgData.path,
          );
          console.warn('[email] HTML (скопируй ссылку в браузер):');
          console.warn(msgData.msg);
          return true;
        }
        console.error(
          'Почта не настроена: на проде задайте RESEND_API_KEY (рекомендуется на Render) или SMTP_*',
        );
        return false;
      }

      const from =
        process.env.SMTP_FROM ?? `"App" <${process.env.SMTP_USER}>`;

      await transport.sendMail({
        from,
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
    const base =
      process.env.PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'http://localhost:5173';
    const url = `${base}/password-recovery?recoveryCode=${encodeURIComponent(code)}`;
    const message = `<h1>Восстановление пароля</h1><p><a href="${url}">Сменить пароль</a></p>`;

    return await this.sendMessage({ path: email, subject, msg: message });
  }
}
