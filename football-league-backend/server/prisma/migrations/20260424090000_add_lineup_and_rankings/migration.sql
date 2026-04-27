-- AlterTable
ALTER TABLE `Player`
  ADD COLUMN `avatar_url` VARCHAR(500) NULL,
  ADD COLUMN `external_source` VARCHAR(50) NULL,
  ADD COLUMN `external_id` VARCHAR(100) NULL,
  ADD COLUMN `is_coach` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `idx_player_name_team` ON `Player`(`name`, `team_id`);

-- CreateIndex
CREATE INDEX `idx_player_external` ON `Player`(`external_source`, `external_id`);

-- CreateTable
CREATE TABLE `match_lineup_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `match_id` INTEGER NOT NULL,
    `team_id` INTEGER NULL,
    `player_id` INTEGER NULL,
    `side` VARCHAR(10) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `position` VARCHAR(20) NULL,
    `jersey_number` INTEGER NULL,
    `formation` VARCHAR(20) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uk_match_side_role_player`(`match_id`, `side`, `role`, `player_id`),
    INDEX `idx_lineup_match_side`(`match_id`, `side`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `player_rankings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `season` VARCHAR(10) NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `rank` INTEGER NOT NULL,
    `player_id` INTEGER NULL,
    `player_name` VARCHAR(50) NOT NULL,
    `team_id` INTEGER NULL,
    `team_name` VARCHAR(50) NULL,
    `avatar_url` VARCHAR(500) NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `source` VARCHAR(50) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_player_ranking_identity`(`season`, `category`, `player_name`, `team_name`),
    INDEX `idx_player_ranking_category`(`season`, `category`, `rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_rankings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `season` VARCHAR(10) NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `rank` INTEGER NOT NULL,
    `team_id` INTEGER NULL,
    `team_name` VARCHAR(50) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `source` VARCHAR(50) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_team_ranking_identity`(`season`, `category`, `team_name`),
    INDEX `idx_team_ranking_category`(`season`, `category`, `rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `match_lineup_entries` ADD CONSTRAINT `match_lineup_entries_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `football_match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_lineup_entries` ADD CONSTRAINT `match_lineup_entries_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `match_lineup_entries` ADD CONSTRAINT `match_lineup_entries_player_id_fkey` FOREIGN KEY (`player_id`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `player_rankings` ADD CONSTRAINT `player_rankings_player_id_fkey` FOREIGN KEY (`player_id`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_rankings` ADD CONSTRAINT `team_rankings_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
