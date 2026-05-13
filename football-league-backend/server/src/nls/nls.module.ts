import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NlsController } from "./nls.controller";
import { NlsService } from "./nls.service";

@Module({
    imports: [ConfigModule],
    controllers: [NlsController],
    providers: [NlsService],
})
export class NlsModule {}
