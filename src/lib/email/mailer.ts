import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  private async getTransporter(): Promise<Transporter> {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendOrderConfirmation(
    customerEmail: string,
    orderCode: string,
    customerName: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ваш заказ подтвержден!</h2>
        <p>Здравствуйте, ${customerName}!</p>
        <p>Ваш заказ <strong>${orderCode}</strong> успешно принят и обрабатывается.</p>
        <p>Мы уведомим вас о статусе доставки.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое письмо, пожалуйста, не отвечайте на него.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Заказ ${orderCode} подтвержден`,
      html,
      text: `Здравствуйте, ${customerName}! Ваш заказ ${orderCode} успешно принят и обрабатывается.`,
    });
  }

  async sendOrderShipped(
    customerEmail: string,
    orderCode: string,
    customerName: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ваш заказ отправлен!</h2>
        <p>Здравствуйте, ${customerName}!</p>
        <p>Ваш заказ <strong>${orderCode}</strong> отправлен и скоро будет доставлен.</p>
        <p>Благодарим за покупку!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое письмо, пожалуйста, не отвечайте на него.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Заказ ${orderCode} отправлен`,
      html,
      text: `Здравствуйте, ${customerName}! Ваш заказ ${orderCode} отправлен и скоро будет доставлен.`,
    });
  }

  async sendOrderDelivered(
    customerEmail: string,
    orderCode: string,
    customerName: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ваш заказ доставлен!</h2>
        <p>Здравствуйте, ${customerName}!</p>
        <p>Ваш заказ <strong>${orderCode}</strong> успешно доставлен.</p>
        <p>Надеемся, вам понравилась покупка!</p>
        <p>Будем рады видеть вас снова!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое письмо, пожалуйста, не отвечайте на него.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: customerEmail,
      subject: `Заказ ${orderCode} доставлен`,
      html,
      text: `Здравствуйте, ${customerName}! Ваш заказ ${orderCode} успешно доставлен. Будем рады видеть вас снова!`,
    });
  }

  async sendPasswordReset(email: string, resetLink: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #10b981; margin: 0;">Metricon</h1>
        </div>
        <h2 style="color: #1f2937; margin-bottom: 16px;">Сброс пароля</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Вы запросили сброс пароля для вашего аккаунта. Нажмите на кнопку ниже, чтобы установить новый пароль:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
            Сбросить пароль
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
          Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
        </p>
        <p style="color: #9ca3af; font-size: 14px;">
          Ссылка действительна в течение 1 часа.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Metricon. Все права защищены.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Сброс пароля — Metricon',
      html,
      text: `Сброс пароля Metricon. Перейдите по ссылке: ${resetLink}`,
    });
  }
}

export const emailService = new EmailService();
