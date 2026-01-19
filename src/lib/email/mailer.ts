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
}

export const emailService = new EmailService();
