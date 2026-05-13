import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlipayService } from './alipay.service';
import { Decimal } from '@prisma/client/runtime/library';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5002';

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private alipayService: AlipayService,
  ) {}

  // ==================== 商品 ====================

  async getProducts(params: { category?: string; teamId?: number; keyword?: string; page?: number; pageSize?: number }) {
    const { category, teamId, keyword, page = 1, pageSize = 20 } = params;
    const where: any = { is_active: true };
    if (category) where.category = category;
    if (teamId) where.team_id = teamId;
    if (keyword) where.name = { contains: keyword };

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { team: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  }

  async getProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { team: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  // ==================== 购物车 ====================

  async getCart(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { user_id: userId },
      include: {
        product: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const total = items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);
    return { items, total: total.toFixed(2) };
  }

  async addToCart(userId: number, productId: number, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.is_active) throw new NotFoundException('商品不存在');
    if (product.stock < quantity) throw new BadRequestException('库存不足');

    const existing = await this.prisma.cartItem.findUnique({
      where: { uk_user_product_cart: { user_id: userId, product_id: productId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) throw new BadRequestException('库存不足');
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: true },
      });
    }

    return this.prisma.cartItem.create({
      data: { user_id: userId, product_id: productId, quantity },
      include: { product: true },
    });
  }

  async updateCartItem(userId: number, cartItemId: number, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, user_id: userId },
      include: { product: true },
    });
    if (!item) throw new NotFoundException('购物车项不存在');
    if (item.product.stock < quantity) throw new BadRequestException('库存不足');

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
      return null;
    }
    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true },
    });
  }

  async removeFromCart(userId: number, cartItemId: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: cartItemId, user_id: userId } });
    if (!item) throw new NotFoundException('购物车项不存在');
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { user_id: userId } });
  }

  // ==================== 订单 ====================

  async createOrder(userId: number, body: { address: string; receiver: string; phone: string; cartItemIds?: number[] }) {
    const { address, receiver, phone, cartItemIds } = body;

    const cartWhere: any = { user_id: userId };
    if (cartItemIds?.length) cartWhere.id = { in: cartItemIds };

    const cartItems = await this.prisma.cartItem.findMany({
      where: cartWhere,
      include: { product: true },
    });

    if (!cartItems.length) throw new BadRequestException('购物车为空');

    for (const item of cartItems) {
      if (!item.product.is_active) throw new BadRequestException(`商品 ${item.product.name} 已下架`);
      if (item.product.stock < item.quantity) throw new BadRequestException(`商品 ${item.product.name} 库存不足`);
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const outTradeNo = `SCC${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const addressSnapshot = JSON.stringify({ address, receiver, phone });

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          user_id: userId,
          total_amount: new Decimal(totalAmount.toFixed(2)),
          out_trade_no: outTradeNo,
          address_snapshot: addressSnapshot,
          status: 'PENDING',
          orderItems: {
            create: cartItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.product.price,
              product_snapshot: JSON.stringify({
                id: item.product.id,
                name: item.product.name,
                image_url: item.product.image_url,
                price: item.product.price,
              }),
            })),
          },
        },
        include: { orderItems: true },
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { id: { in: cartItems.map((i) => i.id) } } });

      return newOrder;
    });

    return order;
  }

  async getOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { user_id: userId },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredIds = orders
      .filter((o) => o.status === 'PENDING' && o.createdAt < fifteenMinutesAgo)
      .map((o) => o.id);

    if (expiredIds.length > 0) {
      await this.prisma.order.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'CANCELLED' },
      });
      for (const order of orders) {
        if (expiredIds.includes(order.id)) (order as any).status = 'CANCELLED';
      }
    }

    return orders;
  }

  async getOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, user_id: userId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  // ==================== 支付 ====================

  async createPayment(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, user_id: userId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'PENDING') throw new BadRequestException('订单状态不允许支付');

    const payUrl = await this.alipayService.createPagePayment({
      outTradeNo: order.out_trade_no,
      totalAmount: Number(order.total_amount).toFixed(2),
      subject: `苏超周边商城 订单${order.out_trade_no}`,
      returnUrl: `${FRONTEND_URL}/shop/payment/result`,
      notifyUrl: `${BACKEND_URL}/api/shop/pay/notify`,
    });

    return { payUrl };
  }

  async handleNotify(params: Record<string, string>) {
    const isValid = this.alipayService.verifyNotifySign(params);
    if (!isValid) {
      this.logger.warn('支付宝通知验签失败');
      return 'fail';
    }

    const { out_trade_no, trade_no, trade_status } = params;
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await this.prisma.order.updateMany({
        where: { out_trade_no, status: 'PENDING' },
        data: { status: 'PAID', alipay_trade_no: trade_no },
      });
    }
    return 'success';
  }

  async queryPaymentStatus(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, user_id: userId } });
    if (!order) throw new NotFoundException('订单不存在');

    if (order.status !== 'PENDING') return { status: order.status, alipayTradeNo: order.alipay_trade_no };

    const trade = await this.alipayService.queryTrade(order.out_trade_no);
    if (trade && (trade.tradeStatus === 'TRADE_SUCCESS' || trade.tradeStatus === 'TRADE_FINISHED')) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID', alipay_trade_no: trade.tradeNo },
      });
      return { status: 'PAID', alipayTradeNo: trade.tradeNo };
    }

    return { status: order.status, alipayTradeNo: order.alipay_trade_no };
  }

  // ==================== 种子数据 ====================

  async seedProducts() {
    const count = await this.prisma.product.count();
    if (count > 0) return { message: '商品数据已存在，跳过初始化', count };

    const teams = await this.prisma.team.findMany({ take: 13 });
    const teamMap = new Map(teams.map((t) => [t.name, t.id]));

    const getTeamId = (name: string) => {
      for (const [k, v] of teamMap.entries()) {
        if (k.includes(name)) return v;
      }
      return null;
    };

    const products = [
      // 球衣
      { name: '南京城市主场球衣 2025赛季', category: '球衣', price: 199, stock: 50, team: '南京', description: '2025赛季南京城市队官方主场球衣，透气速干面料，球迷必备。', image_url: 'https://placehold.co/400x400/0066b3/white?text=南京城市球衣' },
      { name: '苏州东吴主场球衣 2025赛季', category: '球衣', price: 199, stock: 45, team: '苏州', description: '2025赛季苏州东吴队官方主场球衣，经典红色设计。', image_url: 'https://placehold.co/400x400/c91a1a/white?text=苏州东吴球衣' },
      { name: '无锡吴钩主场球衣 2025赛季', category: '球衣', price: 199, stock: 40, team: '无锡', description: '2025赛季无锡吴钩队官方主场球衣，金黄色经典款。', image_url: 'https://placehold.co/400x400/f7b731/black?text=无锡吴钩球衣' },
      { name: '南通支云主场球衣 2025赛季', category: '球衣', price: 199, stock: 35, team: '南通', description: '2025赛季南通支云队官方主场球衣，深红色设计。', image_url: 'https://placehold.co/400x400/a50044/white?text=南通支云球衣' },
      { name: '徐州骁龙主场球衣 2025赛季', category: '球衣', price: 199, stock: 30, team: '徐州', description: '2025赛季徐州骁龙队官方主场球衣，紫色战袍。', image_url: 'https://placehold.co/400x400/8a2be2/white?text=徐州骁龙球衣' },
      // 围巾
      { name: '苏超联赛官方围巾', category: '围巾', price: 59, stock: 100, team: null, description: '苏超联赛官方授权围巾，双面印花，保暖舒适，球场必备。', image_url: 'https://placehold.co/400x400/1a1a2e/white?text=苏超围巾' },
      { name: '南京城市球迷围巾', category: '围巾', price: 59, stock: 80, team: '南京', description: '南京城市队官方球迷围巾，蓝色经典款。', image_url: 'https://placehold.co/400x400/0066b3/white?text=南京围巾' },
      { name: '苏州东吴球迷围巾', category: '围巾', price: 59, stock: 75, team: '苏州', description: '苏州东吴队官方球迷围巾，红色热血款。', image_url: 'https://placehold.co/400x400/c91a1a/white?text=苏州围巾' },
      // 帽子
      { name: '苏超联赛棒球帽', category: '帽子', price: 79, stock: 60, team: null, description: '苏超联赛官方授权棒球帽，可调节帽围，时尚百搭。', image_url: 'https://placehold.co/400x400/2d2d2d/white?text=苏超棒球帽' },
      { name: '南京城市球迷帽', category: '帽子', price: 79, stock: 50, team: '南京', description: '南京城市队官方球迷帽，蓝色刺绣队徽。', image_url: 'https://placehold.co/400x400/0066b3/white?text=南京帽子' },
      { name: '苏州东吴球迷帽', category: '帽子', price: 79, stock: 45, team: '苏州', description: '苏州东吴队官方球迷帽，红色刺绣队徽。', image_url: 'https://placehold.co/400x400/c91a1a/white?text=苏州帽子' },
      // 足球
      { name: '苏超联赛官方比赛用球', category: '足球', price: 299, stock: 20, team: null, description: '苏超联赛官方比赛用球，FIFA认证，专业级别。', image_url: 'https://placehold.co/400x400/ffffff/black?text=苏超足球' },
      { name: '苏超联赛训练足球', category: '足球', price: 129, stock: 40, team: null, description: '苏超联赛官方训练足球，耐用防水，适合日常训练。', image_url: 'https://placehold.co/400x400/f0f0f0/333?text=训练足球' },
      // 钥匙扣
      { name: '南京城市队徽钥匙扣', category: '钥匙扣', price: 29, stock: 200, team: '南京', description: '南京城市队官方队徽钥匙扣，锌合金材质，精致耐用。', image_url: 'https://placehold.co/400x400/0066b3/white?text=南京钥匙扣' },
      { name: '苏州东吴队徽钥匙扣', category: '钥匙扣', price: 29, stock: 180, team: '苏州', description: '苏州东吴队官方队徽钥匙扣，锌合金材质。', image_url: 'https://placehold.co/400x400/c91a1a/white?text=苏州钥匙扣' },
      { name: '苏超联赛纪念钥匙扣', category: '钥匙扣', price: 39, stock: 150, team: null, description: '苏超联赛官方纪念钥匙扣，限量版设计。', image_url: 'https://placehold.co/400x400/gold/black?text=苏超钥匙扣' },
      // 马克杯
      { name: '苏超联赛官方马克杯', category: '马克杯', price: 49, stock: 80, team: null, description: '苏超联赛官方授权马克杯，陶瓷材质，容量350ml。', image_url: 'https://placehold.co/400x400/1a1a2e/white?text=苏超马克杯' },
      { name: '南京城市队徽马克杯', category: '马克杯', price: 49, stock: 60, team: '南京', description: '南京城市队官方马克杯，蓝色队徽印花。', image_url: 'https://placehold.co/400x400/0066b3/white?text=南京马克杯' },
      // 海报
      { name: '苏超2025赛季官方海报套装', category: '海报', price: 39, stock: 100, team: null, description: '苏超2025赛季官方海报套装，共4张，A3尺寸，高清印刷。', image_url: 'https://placehold.co/400x400/1a1a2e/gold?text=苏超海报' },
      { name: '南京城市2025赛季纪念海报', category: '海报', price: 29, stock: 80, team: '南京', description: '南京城市队2025赛季纪念海报，A2尺寸，限量发行。', image_url: 'https://placehold.co/400x400/0066b3/white?text=南京海报' },
    ];

    const created = await Promise.all(
      products.map((p) =>
        this.prisma.product.create({
          data: {
            name: p.name,
            category: p.category,
            price: new Decimal(p.price),
            stock: p.stock,
            description: p.description,
            image_url: p.image_url,
            team_id: p.team ? getTeamId(p.team) : null,
            is_active: true,
          },
        }),
      ),
    );

    return { message: '商品数据初始化成功', count: created.length };
  }
}
