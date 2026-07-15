import { Module } from "@nestjs/common";
import { MainBotController } from "./controllers/main-bot.controller";
import { SecondaryBotController } from "./controllers/secondary-bot.controller";
import { InlineDemoCommand } from "./handlers/inline-demo.command";
import { CommandRegistryService } from "./command-registry.service";
import { CommandsService } from "./commands.service";

@Module({
  providers: [
    MainBotController,
    SecondaryBotController,
    InlineDemoCommand,
    CommandRegistryService,
    CommandsService,
  ],
  exports: [CommandsService, CommandRegistryService, MainBotController, SecondaryBotController],
})
export class CommandsModule {}
