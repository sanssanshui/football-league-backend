import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { AlipayService } from './alipay.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopController],
  providers: [ShopService, AlipayService],
})
export class ShopModule {}
