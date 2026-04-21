import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding...')

    // 1. 用户（初始积分清零，竞猜记录从空开始）
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
    console.log('User:', user.username)

    // 清空旧竞猜记录
    await prisma.guess.deleteMany({ where: { user_id: user.id } })

    // 2. 13支苏超球队
    const teamDefs = [
        { name: '南京城市队',   city: '南京' },
        { name: '苏州东吴队',   city: '苏州' },
        { name: '无锡吴钩队',   city: '无锡' },
        { name: '南通支云队',   city: '南通' },
        { name: '徐州骁龙队',   city: '徐州' },
        { name: '常州龙城队',   city: '常州' },
        { name: '连云港海港队', city: '连云港' },
        { name: '淮安楚州队',   city: '淮安' },
        { name: '盐城大丰队',   city: '盐城' },
        { name: '扬州瘦西湖队', city: '扬州' },
        { name: '镇江金山队',   city: '镇江' },
        { name: '泰州远大队',   city: '泰州' },
        { name: '宿迁项王队',   city: '宿迁' },
    ]
    const teams = await Promise.all(teamDefs.map(t =>
        prisma.team.upsert({
            where: { name: t.name },
            update: {},
            create: { name: t.name, city: t.city, logo_url: '' }
        })
    ))
    const T = (name: string) => teams.find(t => t.name === name)!
    console.log('Teams seeded:', teams.length)

    // 3. 2025赛季全部比赛（26轮，每轮6场，共78场，status=0待开始）
    const matches2025 = [
        // 第1轮
        { home: '南京城市队',   away: '苏州东吴队',   time: '2025-03-08 15:00', venue: '南京奥体中心' },
        { home: '无锡吴钩队',   away: '南通支云队',   time: '2025-03-08 15:00', venue: '无锡体育中心' },
        { home: '徐州骁龙队',   away: '常州龙城队',   time: '2025-03-08 15:00', venue: '徐州奥体中心' },
        { home: '连云港海港队', away: '淮安楚州队',   time: '2025-03-08 15:00', venue: '连云港体育场' },
        { home: '盐城大丰队',   away: '扬州瘦西湖队', time: '2025-03-08 15:00', venue: '盐城体育场' },
        { home: '镇江金山队',   away: '泰州远大队',   time: '2025-03-08 15:00', venue: '镇江体育中心' },
        // 第2轮
        { home: '苏州东吴队',   away: '无锡吴钩队',   time: '2025-03-15 15:00', venue: '苏州奥体中心' },
        { home: '南通支云队',   away: '徐州骁龙队',   time: '2025-03-15 15:00', venue: '南通体育场' },
        { home: '常州龙城队',   away: '连云港海港队', time: '2025-03-15 15:00', venue: '常州体育中心' },
        { home: '淮安楚州队',   away: '盐城大丰队',   time: '2025-03-15 15:00', venue: '淮安体育中心' },
        { home: '扬州瘦西湖队', away: '镇江金山队',   time: '2025-03-15 15:00', venue: '扬州体育公园' },
        { home: '泰州远大队',   away: '宿迁项王队',   time: '2025-03-15 15:00', venue: '泰州体育场' },
        // 第3轮
        { home: '宿迁项王队',   away: '南京城市队',   time: '2025-03-22 15:00', venue: '宿迁体育中心' },
        { home: '无锡吴钩队',   away: '苏州东吴队',   time: '2025-03-22 15:00', venue: '无锡体育中心' },
        { home: '徐州骁龙队',   away: '南通支云队',   time: '2025-03-22 15:00', venue: '徐州奥体中心' },
        { home: '连云港海港队', away: '常州龙城队',   time: '2025-03-22 15:00', venue: '连云港体育场' },
        { home: '盐城大丰队',   away: '淮安楚州队',   time: '2025-03-22 15:00', venue: '盐城体育场' },
        { home: '扬州瘦西湖队', away: '泰州远大队',   time: '2025-03-22 15:00', venue: '扬州体育公园' },
        // 第4轮
        { home: '南京城市队',   away: '无锡吴钩队',   time: '2025-03-29 15:00', venue: '南京奥体中心' },
        { home: '苏州东吴队',   away: '南通支云队',   time: '2025-03-29 15:00', venue: '苏州奥体中心' },
        { home: '常州龙城队',   away: '徐州骁龙队',   time: '2025-03-29 15:00', venue: '常州体育中心' },
        { home: '淮安楚州队',   away: '连云港海港队', time: '2025-03-29 15:00', venue: '淮安体育中心' },
        { home: '镇江金山队',   away: '盐城大丰队',   time: '2025-03-29 15:00', venue: '镇江体育中心' },
        { home: '泰州远大队',   away: '扬州瘦西湖队', time: '2025-03-29 15:00', venue: '泰州体育场' },
        // 第5轮
        { home: '南通支云队',   away: '南京城市队',   time: '2025-04-05 15:00', venue: '南通体育场' },
        { home: '无锡吴钩队',   away: '常州龙城队',   time: '2025-04-05 15:00', venue: '无锡体育中心' },
        { home: '徐州骁龙队',   away: '连云港海港队', time: '2025-04-05 15:00', venue: '徐州奥体中心' },
        { home: '盐城大丰队',   away: '镇江金山队',   time: '2025-04-05 15:00', venue: '盐城体育场' },
        { home: '扬州瘦西湖队', away: '宿迁项王队',   time: '2025-04-05 15:00', venue: '扬州体育公园' },
        { home: '淮安楚州队',   away: '泰州远大队',   time: '2025-04-05 15:00', venue: '淮安体育中心' },
        // 第6轮
        { home: '南京城市队',   away: '徐州骁龙队',   time: '2025-04-12 15:00', venue: '南京奥体中心' },
        { home: '苏州东吴队',   away: '常州龙城队',   time: '2025-04-12 15:00', venue: '苏州奥体中心' },
        { home: '连云港海港队', away: '无锡吴钩队',   time: '2025-04-12 15:00', venue: '连云港体育场' },
        { home: '南通支云队',   away: '盐城大丰队',   time: '2025-04-12 15:00', venue: '南通体育场' },
        { home: '泰州远大队',   away: '镇江金山队',   time: '2025-04-12 15:00', venue: '泰州体育场' },
        { home: '宿迁项王队',   away: '淮安楚州队',   time: '2025-04-12 15:00', venue: '宿迁体育中心' },
        // 第7轮
        { home: '常州龙城队',   away: '南京城市队',   time: '2025-04-19 15:00', venue: '常州体育中心' },
        { home: '无锡吴钩队',   away: '徐州骁龙队',   time: '2025-04-19 15:00', venue: '无锡体育中心' },
        { home: '苏州东吴队',   away: '连云港海港队', time: '2025-04-19 15:00', venue: '苏州奥体中心' },
        { home: '盐城大丰队',   away: '南通支云队',   time: '2025-04-19 15:00', venue: '盐城体育场' },
        { home: '镇江金山队',   away: '扬州瘦西湖队', time: '2025-04-19 15:00', venue: '镇江体育中心' },
        { home: '淮安楚州队',   away: '宿迁项王队',   time: '2025-04-19 15:00', venue: '淮安体育中心' },
        // 第8轮
        { home: '南京城市队',   away: '连云港海港队', time: '2025-04-26 15:00', venue: '南京奥体中心' },
        { home: '徐州骁龙队',   away: '苏州东吴队',   time: '2025-04-26 15:00', venue: '徐州奥体中心' },
        { home: '南通支云队',   away: '无锡吴钩队',   time: '2025-04-26 15:00', venue: '南通体育场' },
        { home: '常州龙城队',   away: '盐城大丰队',   time: '2025-04-26 15:00', venue: '常州体育中心' },
        { home: '扬州瘦西湖队', away: '淮安楚州队',   time: '2025-04-26 15:00', venue: '扬州体育公园' },
        { home: '宿迁项王队',   away: '镇江金山队',   time: '2025-04-26 15:00', venue: '宿迁体育中心' },
        // 第9轮
        { home: '苏州东吴队',   away: '南京城市队',   time: '2025-05-03 15:00', venue: '苏州奥体中心' },
        { home: '连云港海港队', away: '徐州骁龙队',   time: '2025-05-03 15:00', venue: '连云港体育场' },
        { home: '无锡吴钩队',   away: '常州龙城队',   time: '2025-05-03 15:00', venue: '无锡体育中心' },
        { home: '盐城大丰队',   away: '扬州瘦西湖队', time: '2025-05-03 15:00', venue: '盐城体育场' },
        { home: '镇江金山队',   away: '淮安楚州队',   time: '2025-05-03 15:00', venue: '镇江体育中心' },
        { home: '泰州远大队',   away: '南通支云队',   time: '2025-05-03 15:00', venue: '泰州体育场' },
        // 第10轮
        { home: '南京城市队',   away: '盐城大丰队',   time: '2025-05-10 15:00', venue: '南京奥体中心' },
        { home: '徐州骁龙队',   away: '无锡吴钩队',   time: '2025-05-10 15:00', venue: '徐州奥体中心' },
        { home: '苏州东吴队',   away: '泰州远大队',   time: '2025-05-10 15:00', venue: '苏州奥体中心' },
        { home: '常州龙城队',   away: '南通支云队',   time: '2025-05-10 15:00', venue: '常州体育中心' },
        { home: '淮安楚州队',   away: '镇江金山队',   time: '2025-05-10 15:00', venue: '淮安体育中心' },
        { home: '宿迁项王队',   away: '扬州瘦西湖队', time: '2025-05-10 15:00', venue: '宿迁体育中心' },
        // 第11轮
        { home: '无锡吴钩队',   away: '南京城市队',   time: '2025-05-17 15:00', venue: '无锡体育中心' },
        { home: '南通支云队',   away: '苏州东吴队',   time: '2025-05-17 15:00', venue: '南通体育场' },
        { home: '盐城大丰队',   away: '徐州骁龙队',   time: '2025-05-17 15:00', venue: '盐城体育场' },
        { home: '泰州远大队',   away: '常州龙城队',   time: '2025-05-17 15:00', venue: '泰州体育场' },
        { home: '扬州瘦西湖队', away: '连云港海港队', time: '2025-05-17 15:00', venue: '扬州体育公园' },
        { home: '镇江金山队',   away: '宿迁项王队',   time: '2025-05-17 15:00', venue: '镇江体育中心' },
        // 第12轮
        { home: '南京城市队',   away: '泰州远大队',   time: '2025-05-24 15:00', venue: '南京奥体中心' },
        { home: '苏州东吴队',   away: '盐城大丰队',   time: '2025-05-24 15:00', venue: '苏州奥体中心' },
        { home: '徐州骁龙队',   away: '南通支云队',   time: '2025-05-24 15:00', venue: '徐州奥体中心' },
        { home: '连云港海港队', away: '镇江金山队',   time: '2025-05-24 15:00', venue: '连云港体育场' },
        { home: '淮安楚州队',   away: '扬州瘦西湖队', time: '2025-05-24 15:00', venue: '淮安体育中心' },
        { home: '宿迁项王队',   away: '泰州远大队',   time: '2025-05-24 15:00', venue: '宿迁体育中心' },
        // 第13轮
        { home: '南通支云队',   away: '连云港海港队', time: '2025-05-31 15:00', venue: '南通体育场' },
        { home: '无锡吴钩队',   away: '淮安楚州队',   time: '2025-05-31 15:00', venue: '无锡体育中心' },
        { home: '常州龙城队',   away: '苏州东吴队',   time: '2025-05-31 15:00', venue: '常州体育中心' },
        { home: '盐城大丰队',   away: '宿迁项王队',   time: '2025-05-31 15:00', venue: '盐城体育场' },
        { home: '扬州瘦西湖队', away: '南京城市队',   time: '2025-05-31 15:00', venue: '扬州体育公园' },
        { home: '镇江金山队',   away: '徐州骁龙队',   time: '2025-05-31 15:00', venue: '镇江体育中心' },
    ]

    for (const m of matches2025) {
        const homeTeam = T(m.home)
        const awayTeam = T(m.away)
        await prisma.match.create({
            data: {
                home_team_id: homeTeam.id,
                away_team_id: awayTeam.id,
                match_time: new Date(m.time),
                venue: m.venue,
                home_score: 0,
                away_score: 0,
                status: 0,
            }
        })
    }
    console.log(`Seeded ${matches2025.length} 2025-season matches`)

    // 5. 用户关注球队
    await prisma.user.update({
        where: { id: user.id },
        data: {
            focus_teams: `${teams[0].id},${teams[1].id}`,
            focusTeams: { connect: [{ id: teams[0].id }, { id: teams[1].id }] }
        }
    })

    console.log('✅ Seeding all finished!')
}

main()
    .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
