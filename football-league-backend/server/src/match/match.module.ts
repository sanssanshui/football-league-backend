import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchResolver } from './match.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, UsersModule, ChatModule],
  controllers: [MatchController],
  providers: [MatchService, MatchResolver]
})
export class MatchModule {}
