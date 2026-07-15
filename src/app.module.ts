import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BotModule } from "./bot/bot.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    BotModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
