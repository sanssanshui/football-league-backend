import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: '苏超2026赛季官方球衣（主场版）', category: '球衣', price: 299.00, stock: 50, description: '苏超联赛官方授权主场球衣，透气速干面料，官方刺绣队徽，适合球迷收藏与上场穿着。', image_url: '/images/store/jersey-home.jpg' },
  { name: '苏超2026赛季官方球衣（客场版）', category: '球衣', price: 299.00, stock: 50, description: '苏超联赛官方授权客场球衣，经典白色设计，轻薄透气，官方授权印刷。', image_url: '/images/store/jersey-away.jpg' },
  { name: '苏超联赛官方围巾', category: '围巾', price: 89.00, stock: 200, description: '双面提花工艺，苏超LOGO与13支球队配色，保暖舒适，球迷必备应援道具。', image_url: '/images/store/scarf.jpg' },
  { name: '苏超球迷应援围巾（南京城市版）', category: '围巾', price: 79.00, stock: 150, description: '南京城市队专属配色，双面提花工艺，球迷主场应援必备。', image_url: '/images/store/scarf-nanjing.jpg' },
  { name: '苏超联赛棒球帽', category: '帽子', price: 119.00, stock: 100, description: '可调节帽围，刺绣苏超LOGO，防晒透气，适合户外观赛。', image_url: '/images/store/cap.jpg' },
  { name: '苏超球迷毛线帽（冬季款）', category: '帽子', price: 69.00, stock: 120, description: '保暖针织毛线帽，苏超联赛徽章刺绣，冬季主场观赛必备。', image_url: '/images/store/beanie.jpg' },
  { name: '苏超联赛纪念徽章套装（13支球队）', category: '配件', price: 149.00, stock: 80, description: '金属材质，13支球队队徽徽章全套收藏，精美礼盒包装，球迷收藏佳品。', image_url: '/images/store/badges.jpg' },
  { name: '苏超联赛马克杯', category: '纪念品', price: 99.00, stock: 100, description: '陶瓷材质，苏超赛季海报印花，容量350ml，微波炉可用，日常使用与收藏两相宜。', image_url: '/images/store/mug.jpg' },
  { name: '苏超2026赛季纪念版足球', category: '纪念品', price: 199.00, stock: 30, description: '5号标准足球，苏超赛季签名印刷版，官方授权，适合收藏与日常训练。', image_url: '/images/store/football.jpg' },
  { name: '苏超球迷手机壳（通用款）', category: '配件', price: 59.00, stock: 200, description: '支持iPhone/华为/小米主流机型，苏超赛季主题设计，防摔保护，彰显球迷身份。', image_url: '/images/store/phone-case.jpg' },
];

async function main() {
  console.log('开始添加商品数据...');
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({ data: p });
      console.log(`✅ 已添加: ${p.name}`);
    } else {
      console.log(`⏭️  已存在: ${p.name}`);
    }
  }
  const count = await prisma.product.count();
  console.log(`\n✅ 数据库中共有 ${count} 件商品`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
