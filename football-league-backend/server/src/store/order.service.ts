import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getAlipayClient } from './alipay.config';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: number) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { user_id: userId },
      include: { product: true },
    });

    if (cartItems.length === 0) throw new BadRequestException('购物车为空');

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(`商品「${item.product.name}」库存不足`);
      }
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          user_id: userId,
          total_amount: totalAmount,
          status: '待支付',
        },
      });

      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product.price,
        })),
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { user_id: userId } });

      return newOrder;
    });

    const outTradeNo = `ORDER_${order.id}_${Date.now()}`;
    await this.prisma.order.update({
      where: { id: order.id },
      data: { alipay_out_trade_no: outTradeNo },
    });

    const subject = `苏超周边商城订单 #${order.id}`;
    const alipay = getAlipayClient();

    const payUrl = alipay.pageExec('alipay.trade.page.pay', {
      method: 'GET',
      returnUrl: process.env.ALIPAY_RETURN_URL,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL,
      bizContent: {
        out_trade_no: outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: totalAmount.toFixed(2),
        subject,
      },
    }) as string;

    return { orderId: order.id, payUrl, outTradeNo };
  }

  async getUserOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { user_id: userId },
      include: {
        orderItems: {
          include: {
            product: { select: { id: true, name: true, image_url: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, user_id: userId },
      include: {
        orderItems: {
          include: { product: true },
        },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async handleAlipayNotify(body: Record<string, string>) {
    const alipay = getAlipayClient();
    const isValid = alipay.checkNotifySign(body);
    if (!isValid) return 'fail';

    const { trade_status, out_trade_no, trade_no } = body;
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await this.prisma.order.updateMany({
        where: { alipay_out_trade_no: out_trade_no },
        data: { status: '已支付', alipay_trade_no: trade_no },
      });
    }
    return 'success';
  }
}
