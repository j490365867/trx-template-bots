import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { SecondaryBotService } from "./secondary-bot.service";
import { CommandsModule } from "../commands/commands.module";
import { MockDataModule } from "../mock/mock-data.module";

@Module({
  imports: [CommandsModule, MockDataModule],
  providers: [BotService, SecondaryBotService],
  exports: [BotService, SecondaryBotService],
})
export class BotModule {}
