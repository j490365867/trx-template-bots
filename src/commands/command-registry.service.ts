import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { Message, CallbackQuery } from "node-telegram-bot-api";
import { MainBotController } from "./controllers/main-bot.controller";
import { InlineDemoCommand } from "./handlers/inline-demo.command";

@Injectable()
export class CommandRegistryService {
  private readonly logger = new Logger(CommandRegistryService.name);
  private readonly commands: Map<string, { pattern: RegExp; handler: (bot: TelegramBot, msg: Message) => Promise<void> | void }> = new Map();
  /** 已处理的消息 key 集合（chatId:msgId），用于去重 */
  private readonly processedMsgKeys = new Set<string>();
  /** 已处理的回调查询 ID 集合，用于去重 */
  private readonly processedQueryIds = new Set<string>();
  /** 诊断计数器 */
  private stats = { total: 0, dedupSkipped: 0, callbackTotal: 0, callbackDedupSkipped: 0 };

  constructor(
    private readonly mainBotController: MainBotController,
    private readonly inlineDemoCommand: InlineDemoCommand,
  ) {
    this.registerCommand("start", /^\/start(?:\s|$)/, (bot, msg) => this.mainBotController.handleStart(bot, msg));
    this.registerCommand("help", /^\/help(?:\s|$)/, (bot, msg) => this.mainBotController.handleHelp(bot, msg));
    this.registerCommand("inline", /^\/inline(?:\s|$)/, (bot, msg) => this.inlineDemoCommand.handle(bot, msg));
  }

  private registerCommand(
    command: string,
    pattern: RegExp,
    handler: (bot: TelegramBot, msg: Message) => Promise<void> | void,
  ): void {
    if (this.commands.has(command)) {
      this.logger.warn(`命令 "${command}" 已存在，将被覆盖`);
    }
    this.commands.set(command, { pattern, handler });
    this.logger.debug(`已注册命令: /${command}`);
  }

  /**
   * 注册命令监听器到 bot 实例（针对 text 消息）
   */
  registerToBot(bot: TelegramBot): void {
    this.logger.log(`注册 ${this.commands.size} 个命令监听器 (onText)`);

    for (const [, cmd] of this.commands) {
      bot.onText(cmd.pattern, async (msg) => {
        this.logger.debug(`收到命令 from chatId: ${msg.chat.id}`);

        try {
          await cmd.handler(bot, msg);
        } catch (error) {
          this.logger.error(`命令处理失败:`, error);
        }
      });
    }

    // 诊断：注册后检查 message 监听器数量
    const messageCount = bot.listenerCount("message");
    this.logger.log(`当前 bot message 监听器数量: ${messageCount}`);
  }

  /**
   * 注册菜单按钮（普通消息）处理器
   */
  registerMenuHandler(bot: TelegramBot): void {
    bot.on("message", async (msg: Message) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const username = msg.from?.username || msg.from?.first_name || "未知";
      const text = msg.text || "[非文本消息]";

      this.stats.total++;

      // 去重：使用 chatId:msgId 作为 key（message_id 仅在同一 chat 内唯一）
      const dedupKey = `${chatId}:${msg.message_id}`;
      if (this.processedMsgKeys.has(dedupKey)) {
        this.stats.dedupSkipped++;
        this.logger.debug(`[dedup] 跳过重复消息 ${dedupKey}: ${text} (已跳过 ${this.stats.dedupSkipped}/${this.stats.total})`);
        return;
      }
      this.processedMsgKeys.add(dedupKey);
      // 限制集合大小，防止内存泄漏
      if (this.processedMsgKeys.size > 500) {
        const first = this.processedMsgKeys.values().next().value;
        if (first !== undefined) this.processedMsgKeys.delete(first);
      }

      this.logger.log(`收到消息 from ${username}(${userId}) [${chatId}]: ${text}`);

      if (!msg.text || msg.text.startsWith("/")) return;

      try {
        const handled = await this.mainBotController.handleMenuText(bot, msg);
        if (handled) {
          this.logger.debug(`菜单按钮处理: ${msg.text}`);
        }
      } catch (error) {
        this.logger.error(`菜单按钮处理失败:`, error);
      }
    });
  }

  /**
   * 注册回调查询处理器（内联按钮）
   */
  registerCallbackHandler(bot: TelegramBot): void {
    bot.on("callback_query", async (query: CallbackQuery) => {
      const userId = query.from.id;
      const username = query.from.username || query.from.first_name || "未知";

      this.stats.callbackTotal++;

      // 去重：跳过已处理的回调查询
      if (this.processedQueryIds.has(query.id)) {
        this.stats.callbackDedupSkipped++;
        this.logger.debug(`[dedup] 跳过重复回调查询 ${query.id}: ${query.data}`);
        return;
      }
      this.processedQueryIds.add(query.id);
      if (this.processedQueryIds.size > 500) {
        const first = this.processedQueryIds.values().next().value;
        if (first !== undefined) this.processedQueryIds.delete(first);
      }

      this.logger.log(`收到回调查询 from ${username}(${userId}): ${query.data}`);

      try {
        await this.mainBotController.handleCallback(bot, query);
      } catch (error) {
        this.logger.error(`回调查询处理失败:`, error);
      }
    });
  }
}
