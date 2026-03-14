import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')

    // 添加用户 Micro_George
    const user = await prisma.user.upsert({
        where: { username: 'Micro_George' },
        update: {},
        create: {
            username: 'Micro_George',
            password: '88fd19cf4946fdb9283442da02459433edd4902becf38d47da7fdbbc7685066bdd2cbe8c0ace8584b20ae21e5c9e5082da0be0960e8cf0f1cf5721dbcefdad5d',
            score: 0,
            createdAt: new Date('2026-02-28T17:56:36.658Z'),
            updatedAt: new Date('2026-02-28T17:56:36.658Z'),
        },
    })

    console.log('Seeding finished. created user:', user.username)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
