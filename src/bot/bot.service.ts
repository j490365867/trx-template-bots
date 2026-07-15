import { Injectable, OnModuleDestroy, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TelegramBot, { Message, ChatId } from "node-telegram-bot-api";
import { CommandsService } from "../commands/commands.service";
import { MockDataService } from "../mock/mock-data.service";

@Injectable()
export class BotService implements OnApplicationBootstrap, OnModuleDestroy {
  private bot: TelegramBot | null = null;
  private readonly logger = new Logger(BotService.name);
  private isInitialized = false;
  private isRestarting = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandsService: CommandsService,
    private readonly mockDataService: MockDataService,
  ) {}

  onApplicationBootstrap() {
    if (this.isInitialized) {
      this.logger.warn("Bot 已经初始化，跳过重复初始化");
      return;
    }

    this.isInitialized = true;
    this.logger.log("开始初始化 Telegram Bot...");

    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token || token === "your_bot_token_here") {
      this.logger.error("TELEGRAM_BOT_TOKEN 未配置，Bot 无法启动");
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
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        this.bot.close();
      } catch { /* ignore */ }
    }

    this.bot = new TelegramBot(token, { polling: false });

    this.registerHandlers(this.bot);
    await this.bot.startPolling();
    this.setBotCommands(this.bot);
    this.logger.log("Bot 已启动 (polling 模式)");
  }

  private initWebhook(token: string): void {
    this.bot = new TelegramBot(token);

    const webhookUrl = this.configService.get<string>("WEBHOOK_URL");
    if (!webhookUrl) {
      this.logger.warn("WEBHOOK_URL 未配置，回退到 polling 模式");
      this.initPolling(token);
      return;
    }

    this.bot.setWebHook(`${webhookUrl}/webhook`).then(() => {
      this.logger.log(`Webhook 已设置为: ${webhookUrl}/webhook`);
    });

    this.registerHandlers(this.bot);
    this.setBotCommands(this.bot);
    this.logger.log("Bot 已启动 (webhook 模式)");
  }

  /**
   * 通过 webhook 处理 incoming update
   */
  processUpdate(update: any): void {
    if (this.bot) {
      this.bot.processUpdate(update);
    }
  }

  /**
   * 发送消息（供外部调用）
   */
  async sendMessage(chatId: number, text: string, options?: TelegramBot.SendMessageOptions): Promise<void> {
    if (!this.bot) return;
    await this.bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...options,
    });
  }

  /**
   * 推送消息到指定聊天（webhook 推送演示）
   */
  async pushNews(chatId: number): Promise<void> {
    const newsList = this.mockDataService.getNews();
    let message = `📢 <b>【主动消息推送】</b>\n\n`;
    message += `最新资讯已送达！\n\n`;

    newsList.slice(0, 2).forEach((item) => {
      message += `• <b>${item.title}</b>\n`;
      message += `  ${item.summary}\n\n`;
    });

    message += `💡 这是来自机器人的主动推送消息！`;

    await this.sendMessage(chatId, message);
    this.logger.log(`已推送消息到 ${chatId}`);
  }

  /**
   * 发送模拟 JSON 数据
   */
  async sendMockJson(chatId: number, type: string): Promise<void> {
    const data = this.mockDataService.getMockJson(type);
    const message =
      `<b>🔥 模拟 JSON 数据 (${type})</b>\n\n` +
      `<pre>${JSON.stringify(data, null, 2)}</pre>`;

    await this.sendMessage(chatId, message);
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.close();
      this.logger.log("Bot 已关闭");
    }
  }

  private registerHandlers(bot: TelegramBot) {
    // 统一由 CommandRegistryService 管理 message/callback 监听器
    this.commandsService.registerCommands(bot);

    // 网络波动自动重连
    bot.on("polling_error", async (err) => {
      const rawMsg = (err as Error).message || String(err);
      this.logger.error(`Telegram 网络波动: ${rawMsg}`);

      if (this.isRestarting) return;
      this.isRestarting = true;

      if (rawMsg.includes("disconnected") || rawMsg.includes("ETIMEOUT") || rawMsg.includes("ECONNREFUSED")) {
        this.logger.log("检测到连接断开，尝试重新连接...");
        for (let i = 0; i < 3; i++) {
          try {
            await bot.stopPolling();
            await bot.startPolling();
            this.logger.log("重新连接成功");
            break;
          } catch (e) {
            this.logger.warn(`重新连接失败(尝试 ${i + 1}/3): ${(e as Error).message}`);
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }
      this.isRestarting = false;
    });

    bot.on("webhook_error", (err) => {
      this.logger.error(`Webhook 错误: ${(err as Error).message || err}`);
    });

    // 在所有 controller 的 bot.sendMessage 调用中自动重试网络错误
    const originalSendMessage = bot.sendMessage.bind(bot);
    bot.sendMessage = ((...args: Parameters<TelegramBot["sendMessage"]>) => {
      return this.retrySendMessage(originalSendMessage, ...args);
    }) as TelegramBot["sendMessage"];
  }

  private async retrySendMessage(
    fn: (...args: Parameters<TelegramBot["sendMessage"]>) => Promise<Message>,
    ...args: Parameters<TelegramBot["sendMessage"]>
  ): Promise<Message> {
    for (let i = 0; i < 3; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        const errMsg = (error as Error).message || "";
        if ((errMsg.includes("disconnected") || errMsg.includes("ETIMEOUT") || errMsg.includes("ECONNREFUSED")) && i < 2) {
          this.logger.warn(`发送消息网络错误，重试(${i + 1}/3): ${errMsg}`);
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error("sendMessage 重试耗尽");
  }

  private async setBotCommands(bot: TelegramBot): Promise<void> {
    const commands = [
      { command: "start", description: "启动机器人" },
    ];
    for (let i = 0; i < 3; i++) {
      try {
        await bot.setMyCommands(commands);
        this.logger.log("机器人菜单命令已设置");
        return;
      } catch (error) {
        this.logger.warn(`设置菜单命令失败(尝试 ${i + 1}/3): ${(error as Error).message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    this.logger.error("设置机器人菜单命令失败: 已重试3次");
  }
}
