import { Controller, Get, Post, Param, ParseIntPipe, UseGuards, Request, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createOrder(@Request() req: any) {
    const data = await this.orderService.createOrder(req.user.userId);
    return { code: 200, message: '订单创建成功', data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getUserOrders(@Request() req: any) {
    const data = await this.orderService.getUserOrders(req.user.userId);
    return { code: 200, message: '获取订单列表成功', data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const data = await this.orderService.getOrderById(req.user.userId, id);
    return { code: 200, message: '获取订单详情成功', data };
  }

  // Alipay async notify — must be public, must return plain 'success'
  @Post('alipay-notify')
  async alipayNotify(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.orderService.handleAlipayNotify(body);
    res.send(result);
  }
}
