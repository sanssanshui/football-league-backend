import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SearchModule } from './search/search.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, SearchModule, SocialModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
