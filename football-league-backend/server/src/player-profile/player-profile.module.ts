import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlayerProfileController } from './player-profile.controller';
import { PlayerProfileService } from './player-profile.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'football_league_secure_key_2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PlayerProfileController],
  providers: [PlayerProfileService, JwtAuthGuard],
  exports: [PlayerProfileService],
})
export class PlayerProfileModule {}
