import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')

    // 1. 用户（只保留核心测试账号）
    const user = await prisma.user.upsert({
        where: { username: 'Micro_George' },
        update: { score: 0 },
        create: {
            username: 'Micro_George',
            password: '88fd19cf4946fdb9283442da02459433edd4902becf38d47da7fdbbc7685066bdd2cbe8c0ace8584b20ae21e5c9e5082da0be0960e8cf0f1cf5721dbcefdad5d',
            score: 0,
            focus_teams: '',
            createdAt: new Date('2026-02-28T17:56:36.658Z'),
            updatedAt: new Date('2026-02-28T17:56:36.658Z'),
        },
    })
    console.log('Initial user seeded:', user.username)

    // 2. 清空旧竞猜记录 (保持环境整洁)
    await prisma.guess.deleteMany({ where: { user_id: user.id } })
    console.log('Cleanup: old guesses cleared for testing.')

    // 注意：球队、比赛、球员数据已改为通过爬虫动态同步，不再由 seed 脚本硬编码生成。
    console.log('✅ Seeding finished (User only). Dynamic data managed by scrapers.')
}

main()
    .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
