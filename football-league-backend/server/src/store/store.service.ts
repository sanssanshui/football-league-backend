import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async getProducts(category?: string) {
    return this.prisma.product.findMany({
      where: {
        is_active: true,
        ...(category && category !== '全部' ? { category } : {}),
      },
      include: { team: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { team: { select: { id: true, name: true } } },
    });
  }
}
