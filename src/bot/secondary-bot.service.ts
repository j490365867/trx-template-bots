import { Injectable, OnModuleDestroy, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TelegramBot from "node-telegram-bot-api";
import { SecondaryBotController } from "../commands/controllers/secondary-bot.controller";

@Injectable()
export class SecondaryBotService implements OnApplicationBootstrap, OnModuleDestroy {
  private bot: TelegramBot | null = null;
  private readonly logger = new Logger(SecondaryBotService.name);
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly botController: SecondaryBotController,
  ) {}

  onApplicationBootstrap() {
    if (this.isInitialized) {
      this.logger.warn("Bot 已经初始化，跳过重复初始化");
      return;
    }

    this.isInitialized = true;
    this.logger.log("开始初始化 Secondary Telegram Bot...");

    const token = this.configService.get<string>("SECONDARY_BOT_TOKEN");
    if (!token || token === "your_bot_token_here") {
      this.logger.error("SECONDARY_BOT_TOKEN 未配置，Bot 无法启动");
      return;
    }

    const mode = this.configService.get<string>("BOT_MODE") || "polling";

    if (mode === "webhook") {
      this.initWebhook(token);
    } else {
      this.initPolling(token);
    }
  }

  private async initPolling(token: string): Promise<void> {
    this.bot = new TelegramBot(token, { polling: false });

    this.registerHandlers(this.bot);
    await this.bot.startPolling();
    this.setBotCommands(this.bot);
    this.logger.log("Secondary Bot 已启动 (polling 模式)");
  }

  private initWebhook(token: string): void {
    this.bot = new TelegramBot(token);

    const webhookUrl = this.configService.get<string>("WEBHOOK_URL");
    if (!webhookUrl) {
      this.logger.warn("WEBHOOK_URL 未配置，回退到 polling 模式");
      this.initPolling(token);
      return;
    }

    this.bot.setWebHook(`${webhookUrl}/secondary-webhook`).then(() => {
      this.logger.log(`Secondary Webhook 已设置为: ${webhookUrl}/secondary-webhook`);
    });

    this.registerHandlers(this.bot);
    this.setBotCommands(this.bot);
    this.logger.log("Secondary Bot 已启动 (webhook 模式)");
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.close();
      this.logger.log("Secondary Bot 已关闭");
    }
  }

  private registerHandlers(bot: TelegramBot) {
    // 统一消息处理入口
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const username = msg.from?.username || msg.from?.first_name || "未知";
      const text = msg.text || "[非文本消息]";
      this.logger.log(`[Secondary] 收到消息 from ${username}(${userId}) [${chatId}]: ${text}`);

      if (!msg.text) return;

      try {
        if (/^\/start(?:\s|$)/.test(msg.text)) {
          this.logger.debug(`[Secondary] 处理 /start 命令`);
          await this.botController.handleStart(bot, msg);
        } else if (/^\/help(?:\s|$)/.test(msg.text)) {
          this.logger.debug(`[Secondary] 处理 /help 命令`);
          await this.botController.handleHelp(bot, msg);
        } else if (!msg.text.startsWith("/")) {
          const handled = await this.botController.handleMenuText(bot, msg);
          if (handled) {
            this.logger.debug(`[Secondary] 菜单按钮处理: ${msg.text}`);
          }
        }
      } catch (error) {
        this.logger.error(`[Secondary] 消息处理失败:`, error);
      }
    });

    // 回调查询
    bot.on("callback_query", async (query) => {
      const userId = query.from.id;
      const username = query.from.username || query.from.first_name || "未知";
      this.logger.log(`[Secondary] 收到回调查询 from ${username}(${userId}): ${query.data}`);

      try {
        await this.botController.handleCallback(bot, query);
      } catch (error) {
        this.logger.error(`[Secondary] 回调查询处理失败:`, error);
      }
    });

    bot.on("polling_error", (err) => {
      this.logger.error(`[Secondary] Telegram 网络波动: ${(err as Error).message || err}`);
    });

    bot.on("webhook_error", (err) => {
      this.logger.error(`[Secondary] Webhook 错误: ${(err as Error).message || err}`);
    });
  }

  private async setBotCommands(bot: TelegramBot): Promise<void> {
    const commands = [
      { command: "start", description: "启动机器人" },
    ];
    for (let i = 0; i < 3; i++) {
      try {
        await bot.setMyCommands(commands);
        this.logger.log("Secondary 机器人菜单命令已设置");
        return;
      } catch (error) {
        this.logger.warn(`Secondary 设置菜单命令失败(尝试 ${i + 1}/3): ${(error as Error).message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    this.logger.error("Secondary 设置机器人菜单命令失败: 已重试3次");
  }
}
