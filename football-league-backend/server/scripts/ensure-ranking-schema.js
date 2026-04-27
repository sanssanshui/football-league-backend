const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function countRows(sql, ...params) {
  const rows = await prisma.$queryRawUnsafe(sql, ...params);
  return Number(rows?.[0]?.count || 0);
}

async function columnExists(tableName, columnName) {
  return countRows(
    'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    tableName,
    columnName,
  );
}

async function indexExists(tableName, indexName) {
  return countRows(
    'SELECT COUNT(*) AS count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    tableName,
    indexName,
  );
}

async function constraintExists(constraintName) {
  return countRows(
    'SELECT COUNT(*) AS count FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?',
    constraintName,
  );
}

async function addColumn(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) {
    console.log(`skip column ${tableName}.${columnName}`);
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  console.log(`added column ${tableName}.${columnName}`);
}

async function createIndex(tableName, indexName, columns) {
  if (await indexExists(tableName, indexName)) {
    console.log(`skip index ${indexName}`);
    return;
  }
  await prisma.$executeRawUnsafe(`CREATE INDEX \`${indexName}\` ON \`${tableName}\`(${columns})`);
  console.log(`created index ${indexName}`);
}

async function addForeignKey(tableName, constraintName, definition) {
  if (await constraintExists(constraintName)) {
    console.log(`skip foreign key ${constraintName}`);
    return;
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${constraintName}\` ${definition}`);
    console.log(`created foreign key ${constraintName}`);
  } catch (error) {
    console.warn(`warn: could not create foreign key ${constraintName}: ${error.message}`);
  }
}

async function main() {
  await addColumn('Player', 'avatar_url', 'VARCHAR(500) NULL');
  await addColumn('Player', 'external_source', 'VARCHAR(50) NULL');
  await addColumn('Player', 'external_id', 'VARCHAR(100) NULL');
  await addColumn('Player', 'is_coach', 'BOOLEAN NOT NULL DEFAULT false');
  await createIndex('Player', 'idx_player_name_team', '`name`, `team_id`');
  await createIndex('Player', 'idx_player_external', '`external_source`, `external_id`');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`match_lineup_entries\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`match_id\` INTEGER NOT NULL,
      \`team_id\` INTEGER NULL,
      \`player_id\` INTEGER NULL,
      \`side\` VARCHAR(10) NOT NULL,
      \`role\` VARCHAR(20) NOT NULL,
      \`position\` VARCHAR(20) NULL,
      \`jersey_number\` INTEGER NULL,
      \`formation\` VARCHAR(20) NULL,
      \`display_order\` INTEGER NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`uk_match_side_role_player\`(\`match_id\`, \`side\`, \`role\`, \`player_id\`),
      INDEX \`idx_lineup_match_side\`(\`match_id\`, \`side\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('ensured table match_lineup_entries');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`player_rankings\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`season\` VARCHAR(10) NOT NULL,
      \`category\` VARCHAR(30) NOT NULL,
      \`rank\` INTEGER NOT NULL,
      \`player_id\` INTEGER NULL,
      \`player_name\` VARCHAR(50) NOT NULL,
      \`team_id\` INTEGER NULL,
      \`team_name\` VARCHAR(50) NULL,
      \`avatar_url\` VARCHAR(500) NULL,
      \`value\` INTEGER NOT NULL DEFAULT 0,
      \`source\` VARCHAR(50) NULL,
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`uk_player_ranking_identity\`(\`season\`, \`category\`, \`player_name\`, \`team_name\`),
      INDEX \`idx_player_ranking_category\`(\`season\`, \`category\`, \`rank\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('ensured table player_rankings');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`team_rankings\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`season\` VARCHAR(10) NOT NULL,
      \`category\` VARCHAR(30) NOT NULL,
      \`rank\` INTEGER NOT NULL,
      \`team_id\` INTEGER NULL,
      \`team_name\` VARCHAR(50) NOT NULL,
      \`value\` INTEGER NOT NULL DEFAULT 0,
      \`source\` VARCHAR(50) NULL,
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`uk_team_ranking_identity\`(\`season\`, \`category\`, \`team_name\`),
      INDEX \`idx_team_ranking_category\`(\`season\`, \`category\`, \`rank\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('ensured table team_rankings');

  await addForeignKey(
    'match_lineup_entries',
    'match_lineup_entries_match_id_fkey',
    'FOREIGN KEY (`match_id`) REFERENCES `football_match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  );
  await addForeignKey(
    'match_lineup_entries',
    'match_lineup_entries_team_id_fkey',
    'FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  );
  await addForeignKey(
    'match_lineup_entries',
    'match_lineup_entries_player_id_fkey',
    'FOREIGN KEY (`player_id`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  );
  await addForeignKey(
    'player_rankings',
    'player_rankings_player_id_fkey',
    'FOREIGN KEY (`player_id`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  );
  await addForeignKey(
    'team_rankings',
    'team_rankings_team_id_fkey',
    'FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
