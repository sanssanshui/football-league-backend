import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Request() req: any) {
    const data = await this.cartService.getCart(req.user.userId);
    return { code: 200, message: '获取购物车成功', data };
  }

  @Post()
  async addToCart(@Request() req: any, @Body() body: { productId: number; quantity?: number }) {
    const data = await this.cartService.addToCart(req.user.userId, body.productId, body.quantity ?? 1);
    return { code: 200, message: '已加入购物车', data };
  }

  @Patch(':productId')
  async updateCartItem(
    @Request() req: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: { quantity: number },
  ) {
    const data = await this.cartService.updateCartItem(req.user.userId, productId, body.quantity);
    return { code: 200, message: '更新成功', data };
  }

  @Delete(':productId')
  async removeCartItem(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    await this.cartService.removeCartItem(req.user.userId, productId);
    return { code: 200, message: '已移除', data: null };
  }
}
