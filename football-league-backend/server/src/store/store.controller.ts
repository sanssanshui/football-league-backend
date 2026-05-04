import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';

@Controller('api/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('products')
  async getProducts(@Query('category') category?: string) {
    const data = await this.storeService.getProducts(category);
    return { code: 200, message: '获取商品列表成功', data };
  }

  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.storeService.getProductById(id);
    if (!data) throw new NotFoundException('商品不存在');
    return { code: 200, message: '获取商品详情成功', data };
  }
}
