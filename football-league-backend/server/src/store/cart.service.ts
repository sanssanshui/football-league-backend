import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    return this.prisma.cartItem.findMany({
      where: { user_id: userId },
      include: {
        product: {
          select: { id: true, name: true, price: true, image_url: true, stock: true, category: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addToCart(userId: number, productId: number, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.is_active) throw new BadRequestException('商品不存在');
    if (product.stock < quantity) throw new BadRequestException('库存不足');

    const existing = await this.prisma.cartItem.findUnique({
      where: { uk_user_product_cart: { user_id: userId, product_id: productId } },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { product: true },
      });
    }

    return this.prisma.cartItem.create({
      data: { user_id: userId, product_id: productId, quantity },
      include: { product: true },
    });
  }

  async updateCartItem(userId: number, productId: number, quantity: number) {
    if (quantity <= 0) {
      return this.removeCartItem(userId, productId);
    }
    return this.prisma.cartItem.update({
      where: { uk_user_product_cart: { user_id: userId, product_id: productId } },
      data: { quantity },
      include: { product: true },
    });
  }

  async removeCartItem(userId: number, productId: number) {
    await this.prisma.cartItem.delete({
      where: { uk_user_product_cart: { user_id: userId, product_id: productId } },
    });
    return { removed: true };
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { user_id: userId } });
  }
}
