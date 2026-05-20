import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './ai/ai.module';
import { MatchModule } from './match/match.module';
import { NewsModule } from './news/news.module';
import { SocialModule } from './social/social.module';
import { TasksModule } from './tasks/tasks.module';
import { ChatModule } from './chat/chat.module';
import { ShopModule } from './shop/shop.module';
import { NlsModule } from './nls/nls.module';
import { DigitalHumanModule } from './digital-human/digital-human.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    AiModule,
    MatchModule,
    NewsModule,
    SocialModule,
    TasksModule,
    ChatModule,
    ShopModule,
    NlsModule,
    DigitalHumanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}