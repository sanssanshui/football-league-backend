import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DigitalHumanController } from './digital-human.controller';
import { DigitalHumanService } from './digital-human.service';
import { DigitalHumanGateway } from './digital-human.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [DigitalHumanController],
  providers: [DigitalHumanService, DigitalHumanGateway],
  exports: [DigitalHumanService],
})
export class DigitalHumanModule {}
