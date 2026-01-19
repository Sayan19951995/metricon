import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { emailService } from '@/lib/email/mailer';

export async function POST(request: Request) {
  try {
    const { orderId, type, customerEmail, customerName } = await request.json();

    if (!orderId || !type || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { kaspiOrderCode: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let emailSent = false;
    let subject = '';
    let body = '';

    switch (type) {
      case 'confirmation':
        subject = `Заказ ${orderId} подтвержден`;
        body = `Ваш заказ успешно принят и обрабатывается.`;
        emailSent = await emailService.sendOrderConfirmation(
          customerEmail,
          orderId,
          customerName
        );
        break;
      case 'shipped':
        subject = `Заказ ${orderId} отправлен`;
        body = `Ваш заказ отправлен и скоро будет доставлен.`;
        emailSent = await emailService.sendOrderShipped(
          customerEmail,
          orderId,
          customerName
        );
        break;
      case 'delivered':
        subject = `Заказ ${orderId} доставлен`;
        body = `Ваш заказ успешно доставлен.`;
        emailSent = await emailService.sendOrderDelivered(
          customerEmail,
          orderId,
          customerName
        );
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // Save notification to database
    await prisma.emailNotification.create({
      data: {
        orderId: order.id,
        customerEmail,
        subject,
        body,
        status: emailSent ? 'sent' : 'failed',
        sentAt: emailSent ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: emailSent,
      message: emailSent ? 'Email sent successfully' : 'Failed to send email',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const notifications = await prisma.emailNotification.findMany({
      where: status ? { status } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
