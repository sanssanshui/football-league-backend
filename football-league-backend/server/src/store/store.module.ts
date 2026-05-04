import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoreController, CartController, OrderController],
  providers: [StoreService, CartService, OrderService],
})
export class StoreModule {}
