import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')
    
    // 1. 初始化用户
    const user = await prisma.user.upsert({
        where: { username: 'Micro_George' },
        update: {},
        create: {
            username: 'Micro_George',
            password: '88fd19cf4946fdb9283442da02459433edd4902becf38d47da7fdbbc7685066bdd2cbe8c0ace8584b20ae21e5c9e5082da0be0960e8cf0f1cf5721dbcefdad5d',
            score: 120,
            focus_teams: '',
            createdAt: new Date('2026-02-28T17:56:36.658Z'),
            updatedAt: new Date('2026-02-28T17:56:36.658Z'),
        },
    })
    console.log('Seeding user:', user.username)

    // 2. 初始化球队数据
    const teams = await Promise.all([
        prisma.team.upsert({
            where: { name: '南京城市队' },
            update: {},
            create: { 
                name: '南京城市队', 
                city: '南京', 
                logo_url: '' 
            }
        }),
        prisma.team.upsert({
            where: { name: '苏州东吴队' },
            update: {},
            create: { 
                name: '苏州东吴队', 
                city: '苏州', 
                logo_url: '' 
            }
        }),
        prisma.team.upsert({
            where: { name: '无锡吴钩队' },
            update: {},
            create: { 
                name: '无锡吴钩队', 
                city: '无锡', 
                logo_url: '' 
            }
        }),
        prisma.team.upsert({
            where: { name: '南通支云队' },
            update: {},
            create: { 
                name: '南通支云队', 
                city: '南通', 
                logo_url: '' 
            }
        }),
    ])
    console.log('Seeding teams:', teams.map(t => t.name).join(','))

    // 3. 初始化比赛数据
    await Promise.all([
        prisma.match.upsert({
            where: { id: 1 },
            update: {},
            create: {
                home_team_id: teams[0].id,
                away_team_id: teams[1].id,
                match_time: new Date('2026-03-10 15:00:00'),
                venue: '南京奥体中心',
                home_score: 2,
                away_score: 1,
                status: 2,
                shot_count_home: 8,
                shot_count_away: 5,
                possession_rate_home: 55.5
            }
        }),
        prisma.match.upsert({
            where: { id: 2 },
            update: {},
            create: {
                home_team_id: teams[2].id,
                away_team_id: teams[3].id,
                match_time: new Date('2026-03-15 19:30:00'),
                venue: '无锡体育中心',
                home_score: 0,
                away_score: 0,
                status: 0,
            }
        }),
        prisma.match.upsert({
            where: { id: 3 },
            update: {},
            create: {
                home_team_id: teams[1].id,
                away_team_id: teams[2].id,
                match_time: new Date('2026-03-05 14:00:00'),
                venue: '苏州奥体中心',
                home_score: 0,
                away_score: 0,
                status: 2,
            }
        }),
    ])
    console.log('Seeding matches finished')

    // 4. 初始化用户竞猜记录
    await Promise.all([
        prisma.guess.upsert({
            where: { uk_user_match_guess: { user_id: user.id, match_id: 1 } },
            update: {},
            create: {
                user_id: user.id,
                match_id: 1,
                guess_result: 'home_win',
                isCorrect: true,
                status: 1,
                score_cost: 10,
                score_reward: 20
            }
        }),
        prisma.guess.upsert({
            where: { uk_user_match_guess: { user_id: user.id, match_id: 2 } },
            update: {},
            create: {
                user_id: user.id,
                match_id: 2,
                guess_result: 'away_win',
                isCorrect: null,
                status: 0,
                score_cost: 10
            }
        }),
        prisma.guess.upsert({
            where: { uk_user_match_guess: { user_id: user.id, match_id: 3 } },
            update: {},
            create: {
                user_id: user.id,
                match_id: 3,
                guess_result: 'draw',
                isCorrect: false,
                status: 2,
                score_cost: 10,
                score_reward: 0
            }
        }),
    ])
    console.log('Seeding guess records finished')

    // 5. 设置用户默认关注球队
    await prisma.user.update({
        where: { id: user.id },
        data: {
            focus_teams: `${teams[0].id},${teams[1].id}`,
            focusTeams: {
                connect: [{ id: teams[0].id }, { id: teams[1].id }]
            }
        }
    })

    console.log('✅ Seeding all finished!')
}

// 全局错误处理
main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })