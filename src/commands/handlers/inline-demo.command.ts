import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { Message } from "node-telegram-bot-api";
import { ICommandHandler } from "../interfaces/command-handler.interface";
import { createInlineDemoKeyboard } from "../../utils/inline-keyboard.util";

@Injectable()
export class InlineDemoCommand implements ICommandHandler {
  readonly command = "inline";
  readonly description = "内联按钮功能演示";
  readonly pattern = /^\/inline(?:\s|$)/;

  private readonly logger = new Logger(InlineDemoCommand.name);

  async handle(bot: TelegramBot, msg: Message): Promise<void> {
    const chatId = msg.chat.id;

    const demoText =
      `🔘 <b>内联按钮演示</b>\n\n` +
      `消息内的按钮可以执行多种操作：\n\n` +
      `1️⃣ 回调查看 - 点击后自动回复\n` +
      `2️⃣ 外链跳转 - 打开外部链接\n` +
      `3️⃣ 确认对话框 - 确认/取消操作\n\n` +
      `👇 试试点击下面的按钮：`;

    await bot.sendMessage(chatId, demoText, {
      parse_mode: "HTML",
      reply_markup: createInlineDemoKeyboard(),
    });

    this.logger.log(`用户 ${msg.from?.id} 打开了内联按钮演示`);
  }
}
