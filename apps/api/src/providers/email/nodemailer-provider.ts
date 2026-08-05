import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../../config/index.js';
import type { NotificationMessage, NotificationProvider, NotificationResult } from './notification-provider.js';

export class NodemailerNotificationProvider implements NotificationProvider {
  private readonly transporter: Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(config: AppConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth:
        config.email.smtpUser.length > 0
          ? { user: config.email.smtpUser, pass: config.email.smtpPassword }
          : undefined,
    });
    this.fromEmail = config.email.fromEmail;
    this.fromName = config.email.fromName;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { success: true, providerMessageId: info.messageId };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unbekannter SMTP-Fehler',
      };
    }
  }
}
