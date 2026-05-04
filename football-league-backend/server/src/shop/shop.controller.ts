import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // ==================== 商品 ====================

  @Get('products')
  async getProducts(
    @Query('category') category?: string,
    @Query('teamId') teamId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.shopService.getProducts({
      category,
      teamId: teamId ? Number(teamId) : undefined,
      keyword,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return { code: 200, data };
  }

  @Get('products/:id')
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    const data = await this.shopService.getProduct(id);
    return { code: 200, data };
  }

  // ==================== 购物车 ====================

  @UseGuards(JwtAuthGuard)
  @Get('cart')
  async getCart(@Request() req: any) {
    const data = await this.shopService.getCart(req.user.userId);
    return { code: 200, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart')
  async addToCart(@Request() req: any, @Body() body: { productId: number; quantity?: number }) {
    try {
      const data = await this.shopService.addToCart(req.user.userId, body.productId, body.quantity ?? 1);
      return { code: 200, message: '已加入购物车', data };
    } catch (e: any) {
      return { code: 400, message: e.message, data: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('cart/:id')
  async updateCartItem(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { quantity: number },
  ) {
    try {
      const data = await this.shopService.updateCartItem(req.user.userId, id, body.quantity);
      return { code: 200, message: '更新成功', data };
    } catch (e: any) {
      return { code: 400, message: e.message, data: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cart/:id')
  async removeFromCart(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    try {
      await this.shopService.removeFromCart(req.user.userId, id);
      return { code: 200, message: '已移除', data: null };
    } catch (e: any) {
      return { code: 400, message: e.message, data: null };
    }
  }

  // ==================== 订单 ====================

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  async createOrder(
    @Request() req: any,
    @Body() body: { address: string; receiver: string; phone: string; cartItemIds?: number[] },
  ) {
    try {
      const data = await this.shopService.createOrder(req.user.userId, body);
      return { code: 200, message: '订单创建成功', data };
    } catch (e: any) {
      return { code: 400, message: e.message, data: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async getOrders(@Request() req: any) {
    const data = await this.shopService.getOrders(req.user.userId);
    return { code: 200, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  async getOrder(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    try {
      const data = await this.shopService.getOrder(req.user.userId, id);
      return { code: 200, data };
    } catch (e: any) {
      return { code: 404, message: e.message, data: null };
    }
  }

  // ==================== 支付 ====================

  // 必须在 pay/:orderId 之前声明，否则 NestJS 会把 'status' 当作 orderId
  @UseGuards(JwtAuthGuard)
  @Get('pay/status/:orderId')
  async queryPaymentStatus(@Request() req: any, @Param('orderId', ParseIntPipe) orderId: number) {
    try {
      const data = await this.shopService.queryPaymentStatus(req.user.userId, orderId);
      return { code: 200, data };
    } catch (e: any) {
      return { code: 400, message: e.message, data: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay/:orderId')
  async createPayment(@Request() req: any, @Param('orderId', ParseIntPipe) orderId: number) {
    try {
      const data = await this.shopService.createPayment(req.user.userId, orderId);
      return { code: 200, data };
    } catch (e: any) {
      return { code: 400, message: e.message, data: null };
    }
  }

  // 支付宝异步通知（无需鉴权）
  @Post('pay/notify')
  @HttpCode(HttpStatus.OK)
  async handleNotify(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.shopService.handleNotify(body);
    res.send(result);
  }

  // ==================== 管理 ====================

  @Post('admin/seed')
  async seedProducts() {
    const data = await this.shopService.seedProducts();
    return { code: 200, data };
  }
}
