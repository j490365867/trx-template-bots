import TelegramBot from "node-telegram-bot-api";
import { Message } from "node-telegram-bot-api";

export interface ICommandHandler {
  readonly command: string;
  readonly description: string;
  readonly pattern: RegExp;

  handle(bot: TelegramBot, msg: Message): Promise<void> | void;
}
