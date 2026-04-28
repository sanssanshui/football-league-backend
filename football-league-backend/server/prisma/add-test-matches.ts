import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addTestMatches() {
    console.log('Adding test matches for next month...')

    // Get all teams
    const teams = await prisma.team.findMany()
    if (teams.length < 2) {
        console.error('Not enough teams in database. Please run scrapers first.')
        return
    }

    // Create matches for the next 30 days
    const now = new Date()
    const matches = []

    for (let i = 0; i < 10; i++) {
        const matchDate = new Date(now.getTime() + (i + 1) * 3 * 24 * 60 * 60 * 1000) // Every 3 days
        matchDate.setHours(19, 30, 0, 0) // 7:30 PM

        const homeTeam = teams[i % teams.length]
        const awayTeam = teams[(i + 1) % teams.length]

        matches.push({
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            match_time: matchDate,
            venue: `${homeTeam.city}体育中心`,
            home_score: 0,
            away_score: 0,
            status: 0, // 未开始
        })
    }

    // Insert matches
    for (const match of matches) {
        await prisma.match.create({ data: match })
        console.log(`Created match: ${match.home_team_id} vs ${match.away_team_id} on ${match.match_time}`)
    }

    console.log(`✅ Added ${matches.length} test matches`)
}

addTestMatches()
    .catch((e) => { console.error('❌ Failed:', e); process.exit(1) })
    .finally(async () => { await prisma.$disconnect() })
