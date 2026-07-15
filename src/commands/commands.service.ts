import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { CommandRegistryService } from "./command-registry.service";

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);
  private registered = false;

  constructor(private readonly commandRegistry: CommandRegistryService) {}

  registerCommands(bot: TelegramBot): void {
    if (this.registered) {
      this.logger.warn("事件监听器已注册，跳过重复注册");
      return;
    }
    this.registered = true;

    this.logger.log("开始注册事件监听器");
    this.commandRegistry.registerToBot(bot);
    this.commandRegistry.registerMenuHandler(bot);
    this.commandRegistry.registerCallbackHandler(bot);
  }
}
