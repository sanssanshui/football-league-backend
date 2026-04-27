const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const servicePath = path.join(__dirname, '..', 'src', 'match', 'match.service.ts');
  const source = fs.readFileSync(servicePath, 'utf8');
  const rows = [...source.matchAll(/\{ week: '([^']+)', date: '([^']+)', home: '([^']+)', away: '([^']+)', venue: '([^']+)' \}/g)]
    .map((match) => ({
      week: match[1],
      date: match[2],
      home: match[3],
      away: match[4],
      venue: match[5],
    }));

  let updated = 0;
  for (const row of rows) {
    updated += await prisma.$executeRawUnsafe(
      'UPDATE football_match m JOIN teams h ON h.id=m.home_team_id JOIN teams a ON a.id=m.away_team_id SET m.venue=? WHERE DATE(m.match_time)=? AND h.name=? AND a.name=? AND YEAR(m.match_time)=2026',
      row.venue,
      row.date,
      row.home,
      row.away,
    );
  }

  console.log(`updated=${updated} rows=${rows.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
