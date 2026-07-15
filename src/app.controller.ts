import { Controller, Post, Body, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BotService } from "./bot/bot.service";

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Telegram Webhook 入口
   * 仅在 BOT_MODE=webhook 时处理 Telegram 推送的更新
   * 避免 polling 模式下误处理导致消息重复
   */
  @Post("webhook")
  handleWebhook(@Body() update: any): string {
    const mode = this.configService.get<string>("BOT_MODE") || "polling";
    if (mode !== "webhook") {
      this.logger.warn(`收到 webhook 请求但当前模式为 ${mode}，已忽略`);
      return "ignored";
    }
    this.logger.debug(`收到 webhook update: ${update?.update_id}`);
    this.botService.processUpdate(update);
    return "ok";
  }
}
