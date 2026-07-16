import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { Message, CallbackQuery } from "node-telegram-bot-api";
import { MainMenuTextConstants } from "../../common/constants/menu-text.constants";
import {createMainMenuKeyboard, createSecondaryMenuKeyboard} from "../../utils/keyboard.util";
import {
  createAddressKeyboard,
  createPersonalCenterKeyboard,
  createSmartCustodyKeyboard,
  createDurationLeaseKeyboard,
  createEnergyRentKeyboard,
  createStartKeyboard,
  createRechargeKeyboard,
  createNotificationKeyboard,
  createBatchPackageKeyboard,
  createAddressManageKeyboard,
} from "../../utils/inline-keyboard.util";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class MainBotController {
  private readonly logger = new Logger(MainBotController.name);
  private readonly pendingTrustOrders = new Map<number, { batchCount: string; energy: string; fee: string; bandwidth: boolean }>();
  private readonly pendingLeaseOrders = new Map<number, { batchCount: string; energy: string; fee: string }>();

  constructor() {}

  // ==================== 命令处理 ====================

  async handleStart(bot: TelegramBot, msg: Message): Promise<void> {
    const chatId = msg.chat.id;

    const welcomeMessage =
      `<b>🏠 欢迎使用TG多功能机器人！本机器人提供以下服务：</b>

` +
      `🔸 <b>能量租赁</b>：转U即可省 80% TRX手续费
` +
      `🔹 <b>笔数套餐</b>：不限时间地址，用1笔扣1笔
` +
      `🔸 <b>TRX 闪兑</b>：全网最高汇率，兑换秒到账
` +
      `🔹 <b>智能托管</b>：自动补能，省心省力
` +
      `🔸 <b>时长租赁</b>：灵活租用，按需选择
` +
      `🔹 <b>能量预支、地址监控、余额查询</b>`;

    const welcomeFooter =
      `\n\n⚠️如需帮助，请联系客服：<a href="https://t.me/trxenio">@trxenio</a>`;

    try {
      // 发送 banner 图
      const bannerPath = path.join(__dirname, "../../img/bot-banner.jpg");
      if (fs.existsSync(bannerPath)) {
        await bot.sendPhoto(chatId, fs.createReadStream(bannerPath), {
          caption: welcomeMessage + welcomeFooter,
          parse_mode: "HTML",
          reply_markup: createMainMenuKeyboard(),
        });
      } else {
        await bot.sendMessage(chatId, welcomeMessage + welcomeFooter, {
          parse_mode: "HTML",
          reply_markup: createMainMenuKeyboard(),
          disable_web_page_preview: true,
        });
      }
      this.logger.log(`用户 ${msg.from?.id} 启动了机器人`);
    } catch (error) {
      this.logger.error(`发送欢迎消息失败 (chatId: ${chatId}):`, error);
      await bot.sendMessage(chatId, `欢迎使用！`);
    }
  }

  async handleHelp(bot: TelegramBot, msg: Message): Promise<void> {
    const chatId = msg.chat.id;

    const helpText =
      `🤖 <b>TRX 能量小站 · 帮助</b>\n\n` +
      `<b>菜单列表</b>\n` +
      `💱 <b>TRX闪兑</b>\n` +
      `⚡ <b>能量闪租</b>\n` +
      `🤖 <b>智能托管</b>\n` +
      `🔋 <b>时长租赁</b>\n` +
      `🕹 <b>指令下单</b>\n` +
      `👤 <b>个人中心</b>\n` +
      `▸ 📢 <b>通知</b>\n\n` +
      `<b>命令</b>\n` +
      `/start  启动机器人\n\n` +
      `<b>💡 点击下方菜单按钮体验</b>`;

    await bot.sendMessage(chatId, helpText, { parse_mode: "HTML" });
    this.logger.log(`用户 ${msg.from?.id} 查看了帮助`);
  }

  // ==================== 菜单文本处理 ====================

  async handleMenuText(bot: TelegramBot, msg: Message): Promise<boolean> {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return false;

    const msgId = msg.message_id;

    switch (text) {
      case MainMenuTextConstants.USDT_TO_TRX:
        await this.handleUsdtToTrx(bot, chatId, msgId);
        return true;
      case MainMenuTextConstants.SMART_CUSTODY:
        await this.handleSmartCustody(bot, chatId, msgId);
        return true;
      case MainMenuTextConstants.ENERGY_RENT:
        await this.handleEnergyRent(bot, chatId, msgId);
        return true;
      case MainMenuTextConstants.PERSONAL_CENTER:
        await this.handlePersonalCenter(bot, chatId, msg);
        return true;
      case MainMenuTextConstants.DURATION_LEASE:
        await this.handleDurationLease(bot, chatId, msgId);
        return true;
      case MainMenuTextConstants.CMD_ENERGY:
        await this.handleCmdEnergy(bot, chatId, msgId);
        return true;
      case MainMenuTextConstants.BATCH_PACKAGE:
        await this.handleBatchPackage(bot, chatId, msgId);
        return true;
      case MainMenuTextConstants.NOTIFICATION:
        await this.handleNotification(bot, chatId, msgId);
        return true;
      default:
        if (/^\d+(\.\d+)?$/.test(text)) {
          await this.handleRechargeAmount(bot, chatId, text, "TRX", msgId);
          return true;
        }
        // TRC20 地址输入 → 智能托管 / 能量订单
        if (/^T[A-Za-z0-9]{33}$/.test(text)) {
          // 先检查智能托管地址输入
          const trustOrder = this.pendingTrustOrders.get(chatId);
          if (trustOrder) {
            this.pendingTrustOrders.delete(chatId);
            const trustMsg =
              `\n🤖 <b>托管订单</b>\n` +
              `\n\n` +
              `笔数:    ${trustOrder.batchCount} 笔（<b>${trustOrder.energy}</b> 能量）\n` +
              `单价:    <b>2.50 TRX</b>\n` +
              `总额:    <b>${trustOrder.fee} TRX</b>\n\n` +
              (trustOrder.bandwidth ? `🛜 包带宽\n\n` : ``) +
              `接收地址:  <code>${text}</code>`;
            await bot.sendMessage(chatId, trustMsg, {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ 确认开通", callback_data: "trust:confirm" },
                    { text: "❌ 取消", callback_data: "action:close" },
                  ],
                ],
              },
            });
            this.logger.log(`用户 ${chatId} 创建托管订单: ${trustOrder.batchCount}笔`);
            return true;
          }

          const order = this.pendingLeaseOrders.get(chatId);
          if (order) {
            this.pendingLeaseOrders.delete(chatId);
            const orderId = Math.floor(100000000 + Math.random() * 900000000);
            const msg =
              `⚡ <b>能量时长订单</b>\n` +
              `\n` +
              `时长:    <b>1 小时</b>\n` +
              `笔数:    ${order.batchCount} 笔（<b>${order.energy}</b> 能量）\n` +
              `单价:    <b>2.50 TRX</b>\n` +
              `总额:    <b>${order.fee} TRX</b>\n\n` +
              `接收地址:  <code>${text}</code>`;
            await bot.sendMessage(chatId, msg, {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "💳 余额支付", callback_data: "lease:pay_balance" },
                    { text: "❌ 取消", callback_data: "action:close" },
                  ],
                ],
              },
            });
            this.logger.log(`用户 ${chatId} 创建能量订单 ${orderId}: ${order.batchCount}笔`);
            return true;
          }
          // 无待支付订单 → 余额不足
          await bot.sendMessage(chatId,
            `\n❌ <b>余额不足</b>，请先充值`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💰 去充值", callback_data: "recharge" }],
                ],
              },
            },
          );
          return true;
        }
        return false;
    }
  }

  private async handleBatchPackage(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    const text =
      `🔥 <b>笔数套餐</b>\n` +
      `\n` +
      `•  不限时间、不限地址，用1笔扣1笔\n` +
      `•  带宽套餐，每日低消仅 5K 带宽，至少可省 50% 带宽费\n` +
      `•  越用越划算，专为高频交易地址量身打造\n` +
      `•  托管自动防护，避免错转误转\n\n` +
      `<b>👇 选择套餐</b>\n\n` +
      `🟢    20笔  =  <b>3.7 TRX</b>/笔\n` +
      `          30笔  =  <b>3.7 TRX</b>/笔\n` +
      `          50笔  =  <b>3.7 TRX</b>/笔\n\n` +
      `🔵  100笔  =  <b>3.6 TRX</b>/笔\n` +
      `        200笔  =  <b>3.6 TRX</b>/笔\n` +
      `        300笔  =  <b>3.6 TRX</b>/笔\n\n` +
      `🔴  500笔  =  <b>3.5 TRX</b>/笔\n` +
      `      1000笔  =  <b>3.5 TRX</b>/笔\n` +
      `      2000笔  =  <b>3.5 TRX</b>/笔\n\n` +
      `剩余带宽：<b>0</b>\n` +
      `剩余笔数：<b>0</b> 笔\n\n` +
      `⚡️如需帮助，请联系客服：<a href="https://t.me/trxenio">@trxenio</a>`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createBatchPackageKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询笔数套餐`);
  }

  private async handleRechargeAmount(bot: TelegramBot, chatId: number, amount: string, currency: string, msgId?: number): Promise<void> {
    const orderId = Math.floor(100000000 + Math.random() * 900000000);
    const transferAmount = (parseFloat(amount) * (1 + Math.random() * 0.02)).toFixed(4);
    const address = "TUgS2mTW7wbhqnaHgA4PWLrfEYZB5nHHwH";
    const text =
      `💎 <b>充值订单</b>\n\n` +
      `编号:    <b>${orderId}</b>\n` +
      `币种:    <b>${currency}</b>\n\n` +
      `🔸 转账地址:\n` +
      `<code>${address}</code>\n\n` +
      `💵 转账金额:\n` +
      `<code>${transferAmount}</code> <b>${currency}</b>\n\n` +
      `⚠️ 请严格按以上金额转账，否则无法自动到账\n` +
      `⚠️ 订单有效期 14 分钟`;
    await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    this.logger.log(`用户 ${chatId} 发起 ${currency} 充值: ${amount}`);
  }

  private async handleUsdtToTrx(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    const text =
      `🔸 <b>转账 USDT，自动按汇率兑换为 TRX</b>\n` +
      `🔸️ 全自动到账，默认返回原地址\n\n` +
      `🔹️ 当前汇率:\n` +
      `       <b>1 USDT = 3.05 TRX</b>\n` +
      `🔹️ 兑换地址:\n` +
      `       <code>TYzZxa2A8LsRKjq9LgqQ7yWyz1zEJNthD4</code>\n` +
      `       (点击地址复制)\n\n` +
      `⚠️ 交易所转账请提前说明\n` +
      `⚠️ 如需转回其他地址请提前说明`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💁 联系客服", url: "https://t.me/trxenio" }],
        ],
      },
    });
    this.logger.log(`用户 ${chatId} 查询TRX闪兑`);
  }

  private async handleSmartCustody(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    const text =
      `🤖<b>智能托管说明</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `适合每日多次转账的高频用户。地址始终保持能量状态，低于即补，无需每次手动购买，直接转账即可。\n\n` +
      `💰<b>资费标准</b>\n` +
      `      <b>转账费（按次扣除）：</b>\n` +
      `      6.55 万能量 ➡️ 2.50 TRX / 笔 (对方有 U)\n` +
      `      13.1 万能量 ➡️ 5.00 TRX / 笔 (对方无 U 或交易所)\n` +
      `      <b>占用费：</b>0.10 TRX / 小时 (按实际占用时长计算)\n` +
      `      <b>包带宽费用：</b> 0.30 TRX\n\n` +
      `🚀 <b>使用步骤</b>\n` +
      `       <b>充值：</b>确保机器人账户内 TRX 余额充足。\n` +
      `       <b>开通：</b>点击下方 [ 新增地址 ]，选择能量规格并输入地址即可。\n\n` +
      `📌 <b>规则要点</b>\n` +
      `       <b>低于即补：</b>能量消耗后系统自动补满。\n` +
      `       <b>随开随关：</b>可随时关闭托管，关闭后不再扣费。\n` +
      `       <b>自动关闭：</b>若 48 小时内未转账，系统将自动关闭托管。\n\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `<b>账户余额：</b>0.00 TRX (<code>余额不足，请先充值</code>)`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createSmartCustodyKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询托管`);
  }

  private async handleEnergyRent(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    const text =
      `⚡ <b>能量闪租</b>\n\n` +
      `🔸 <b>转账以下金额，立即获得能量</b>（谁转谁得）\n` +
      `         <b>2.5 TRX </b> =  1 笔（65,500 能量）\n` +
      `         <b>5.0 TRX </b> =  2 笔（131,000 能量）\n` +
      `         <b>7.5 TRX </b> =  3 笔（196,500 能量）\n` +
      `       <b>10.0 TRX</b>  =  4 笔（262,000 能量）\n` +
      `       <b>12.5 TRX</b>  =  5 笔（327,500 能量）\n\n` +
      `🔹 收款地址:\n` +
      `       <code>TBshqZcsq8C6zN38BZeri8E8TjgiqcswLF</code>\n` +
      `       (点击地址复制)\n\n` +
      `⚠️ ️请在 1 小时内使用，过期回收\n` +
      `⚠️  对方无 U 或转交易所，需要2笔能量`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createEnergyRentKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询买能量`);
  }

  private async handlePersonalCenter(bot: TelegramBot, chatId: number, msg: Message): Promise<void> {
    const userId = msg.from?.id || chatId;
    const username = msg.from?.first_name || msg.from?.username || "未知";
    const text =
      `👤 <b>账户信息</b>\n\n` +
      `用户ID:     <code>${userId}</code>\n` +
      `用户名:     ${username}\n` +
      `账号余额:  <b>0.00 TRX</b>`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createPersonalCenterKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查看账户`);
  }

  private async handleDurationLease(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    const text =
      `🔋 <b>时长租赁</b>\n\n` +
      `🔸 租用能量,转账无需 TRX 消耗, 0 手续费!\n` +
      `🔹 租赁时长 <b>1 小时</b>，可用余额支付\n\n` +
      `⚠️ 对未激活地址转账手续费需要双倍`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createDurationLeaseKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询时长租赁`);
  }

  private async handleCmdEnergy(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    const text =
      `🤖 <b>指令租能量</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `💵 每笔指令费用：2.2 TRX\n` +
      `👤 当前账户余额：0.00 TRX\n\n` +
      `📌 <b>扣费与返还规则</b>\n` +
      `<b>• 接收方地址 无 U </b>➡️ 扣除 4.4 TRX（系统自动补足全额能量）\n` +
      `<b>• 接收方地址 有 U </b>➡️ 预扣 4.4 TRX（交易成功后自动返还 2.2 TRX，实际仅收 2.2 TRX）\n\n` +
      `⏳ 租用的能量有效期为 1 小时，下单后请尽快完成转账，避免过期。\n\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `📖 <b>快捷指令使用说明</b>\n\n` +
      `为了提高您的转账效率，本机器人支持 "数字指令" 快速下单：\n` +
      `<b>• 绑定地址：</b>\n` +
      `      点击下方 [ 添加地址 ] 绑定您的常用波场地址。\n` +
      `<b>• 获取指令：</b>\n` +
      `      绑定成功后，地址后方会生成专属的数字编号（例如：指令:11、指令:22）。\n` +
      `<b>• 快速下单：</b>\n` +
      `      在聊天框中直接发送对应的数字（例如直接发送 11 或 22），系统将自动为您绑定的该地址秒级注入能量，无需再点击按钮。\n\n` +
      `👇 请选择地址下单（或直接发送指令数字）👇`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createAddressManageKeyboard()
    });
    this.logger.log(`用户 ${chatId} 查询指令租能量`);
  }

  private async sendRechargeMessage(bot: TelegramBot, chatId: number): Promise<void> {
    await bot.sendMessage(chatId,
      `💰 <b>余额充值</b>\n\n` +
      `🔸 USDT 充值自动按汇率兑换为 TRX\n` +
      `🔹 当前汇率  <b>1 USDT = 3.05 TRX</b>`,
      {
        parse_mode: "HTML",
        reply_markup: createRechargeKeyboard(),
      },
    );
  }

  private async handleNotification(bot: TelegramBot, chatId: number, msgId?: number): Promise<void> {
    await bot.sendMessage(chatId,
      `选择通知类型：`,
      {
        parse_mode: "HTML",
        reply_markup: createNotificationKeyboard(),
      },
    );
    this.logger.log(`用户 ${chatId} 查看通知`);
  }

// ==================== 回调查询处理 ====================

  async handleCallback(bot: TelegramBot, query: CallbackQuery): Promise<void> {
    const data = query.data;
    const chatId = query.message?.chat.id;
    const msgId = query.message?.message_id;

    if (!data || !chatId) return;

    // 关闭/删除消息
    if (data === "action:close" && msgId) {
      await bot.deleteMessage(chatId, msgId);
      await bot.answerCallbackQuery(query.id, { text: "已关闭" });
      return;
    }

    // 联系客服
    if (data === "action:contact") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, "📞 联系 @support_bot");
      return;
    }

    // 确认/取消
    if (data.startsWith("confirm:")) {
      const action = data.split(":")[1];
      if (action === "yes") {
        await bot.sendMessage(chatId, "✅ 已确认");
      } else {
        await bot.sendMessage(chatId, "❌ 已取消");
      }
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 余额充值
    if (data === "recharge") {
      await bot.answerCallbackQuery(query.id);
      await this.sendRechargeMessage(bot, chatId);
      return;
    }

    if (data.startsWith("recharge:")) {
      const option = data.split(":")[1];
      if (option === "custom_trx") {
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId,
          `💰 <b>自定义充值</b>\n\n请输入 TRX 金额：`,
          { parse_mode: "HTML" },
        );
        return;
      }
      if (option === "custom_usdt") {
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId,
          `💰 <b>自定义充值</b>\n\n请输入 USDT 金额：`,
          { parse_mode: "HTML" },
        );
        return;
      }
      const presetMap: Record<string, { amount: string; currency: string }> = {
        "100trx": { amount: "100", currency: "TRX" },
        "200trx": { amount: "200", currency: "TRX" },
        "500trx": { amount: "500", currency: "TRX" },
        "1000trx": { amount: "1000", currency: "TRX" },
        "2000trx": { amount: "2000", currency: "TRX" },
        "5000trx": { amount: "5000", currency: "TRX" },
        "30u": { amount: "30", currency: "USDT" },
        "50u": { amount: "50", currency: "USDT" },
        "100u": { amount: "100", currency: "USDT" },
        "200u": { amount: "200", currency: "USDT" },
        "500u": { amount: "500", currency: "USDT" },
        "1000u": { amount: "1000", currency: "USDT" },
      };
      await bot.answerCallbackQuery(query.id);
      await this.handleRechargeAmount(bot, chatId, presetMap[option].amount, presetMap[option].currency);
      return;
    }

    // 笔数套餐
    if (data.startsWith("batch_pkg:")) {
      const action = data.split(":")[1];
      if (action === "select") {
        const batchCount = data.split(":")[2];
        await bot.answerCallbackQuery(query.id, { text: `✅ 已选择 ${batchCount}笔套餐` });
        await bot.sendMessage(chatId,
          `🔸 输入接收地址：`,
          { parse_mode: "HTML" },
        );
        return;
      }
      if (action === "label") {
        await bot.answerCallbackQuery(query.id);
        return;
      }
    }

    // 智能托管 - 地址管理
    if (data === "trust:list") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `📋 <b>地址管理</b>\n\n选择要管理的地址：`,
        {
          parse_mode: "HTML",
          reply_markup: createAddressKeyboard(),
        },
      );
      return;
    }

    if (data === "trust:add") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `选择托管套餐：`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "1笔(65,500)能量", callback_data: "trust:plan:1energy" },
                { text: "2笔(131,000)能量", callback_data: "trust:plan:2energy" },
              ],
              [
                { text: "1笔(包带宽)", callback_data: "trust:plan:1bw" },
                { text: "2笔(包带宽)", callback_data: "trust:plan:2bw" },
              ],
            ],
          },
        },
      );
      return;
    }

    if (data.startsWith("trust:plan:")) {
      await bot.answerCallbackQuery(query.id);
      const planKey = data.replace("trust:plan:", "");
      const trustPlanMap: Record<string, { batchCount: string; energy: string; fee: string; bandwidth: boolean }> = {
        "1energy": { batchCount: "1", energy: "65,500", fee: "2.50", bandwidth: false },
        "2energy": { batchCount: "2", energy: "131,000", fee: "5.00", bandwidth: false },
        "1bw": { batchCount: "1", energy: "65,500", fee: "2.70", bandwidth: true },
        "2bw": { batchCount: "2", energy: "131,000", fee: "5.20", bandwidth: true },
      };
      const plan = trustPlanMap[planKey];
      if (plan) {
        this.pendingTrustOrders.set(chatId, plan);
      }
      await bot.sendMessage(chatId,
        `🔸 输入接收地址：`,
        { parse_mode: "HTML" },
      );
      return;
    }

    if (data === "trust:confirm") {
      await bot.answerCallbackQuery(query.id, { text: "✅ 托管已开通！" });
      await bot.sendMessage(chatId, "✅ 托管已开通，能量将自动补充。");
      return;
    }

    // 能量订单
    if (data.startsWith("lease:")) {
      const option = data.split(":")[1];
      if (option === "1h_pay") {
        await bot.answerCallbackQuery(query.id);
        return;
      }
      if (option === "pay_balance") {
        await bot.answerCallbackQuery(query.id, { text: "✅ 支付成功！" });
        await bot.sendMessage(chatId,
          `🎉 <b>能量租赁成功</b>\n\n` +
          `预付款:  <b>5 TRX</b>\n` +
          `租用:  <b>131,000</b> 能量\n` +
          `当前余额:  <b>6,465.70 TRX</b>\n\n` +
          `⚠️ 请在 60 分钟内使用能量`,
          { parse_mode: "HTML" },
        );
        return;
      }
      if (/^\d+batch$/.test(option)) {
        const batchNum = option.replace("batch", "");
        const planMap: Record<string, { energy: string; fee: string }> = {
          "1": { energy: "65,500", fee: "2.50" },
          "2": { energy: "131,000", fee: "5.00" },
          "3": { energy: "196,500", fee: "7.50" },
          "4": { energy: "262,000", fee: "10.00" },
          "5": { energy: "327,500", fee: "12.50" },
          "10": { energy: "655,000", fee: "25.00" },
          "20": { energy: "1,310,000", fee: "50.00" },
        };
        const plan = planMap[batchNum];
        if (plan) {
          this.pendingLeaseOrders.set(chatId, { batchCount: batchNum, ...plan });
        }
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId,
          `🔸 输入接收地址：`,
          { parse_mode: "HTML" },
        );
        return;
      }
      const leaseNames: Record<string, string> = {
        "10min": "10 分钟",
        "1h": "1 小时",
        "3h": "3 小时",
        "1d": "1 天",
        "2d": "2 天",
        "3d": "3 天",
        "otheraddr": "输入其他地址",
        pay: "余额支付功能开发中...",
      };
      const text = leaseNames[option] || "未知选项";
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, text);
      return;
    }

    // 个人中心
    if (data === "buy_trx") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, "⏳ 购买 TRX 功能开发中...");
      return;
    }

    // 地址管理
    if (data === "addr:active") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🟢 <b>开启中的地址</b>\n\n暂无开启中的地址。`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 返回", callback_data: "trust:list" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:closed") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🔴 <b>关闭中的地址</b>\n\n暂无关闭中的地址。`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 返回", callback_data: "trust:list" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:enable_all") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `✅ <b>开启全部托管</b>\n\n没有可一键开启的地址。`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📋 地址管理", callback_data: "trust:list" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:disable_all") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `⛔ <b>关闭全部托管</b>\n\n没有可一键关闭的地址。`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📋 地址管理", callback_data: "trust:list" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:add") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🔸 输入要添加的地址：`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ 取消", callback_data: "action:close" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:delete") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🗑 <b>删除地址</b>\n\n选择要删除的地址：`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "暂无可删除的地址", callback_data: "addr:noop" }],
              [{ text: "🔙 返回", callback_data: "nav:cmd_energy" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:deleteAuto") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🗑 <b>删除地址</b>\n\n如需删除开启中的地址请先关闭。\n\n选择需要删除的地址：`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "暂无可删除的地址", callback_data: "addr:noop" }],
              [{ text: "🔙 返回", callback_data: "trust:list" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "nav:cmd_energy") {
      await bot.answerCallbackQuery(query.id);
      await this.handleCmdEnergy(bot, chatId);
      return;
    }

    if (data === "addr:send") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🔸 输入接收地址：`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 返回", callback_data: "nav:cmd_energy" }],
            ],
          },
        },
      );
      return;
    }

    if (data === "addr:back") {
      await bot.answerCallbackQuery(query.id);
      await this.handleSmartCustody(bot, chatId);
      return;
    }

    if (data === "addr:noop") {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // 启动页
    if (data === "start:bind") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, "🔸 输入要绑定的 TRC20 地址：");
      return;
    }

    // 通知消息
    if (data.startsWith("notify:")) {
      const type = data.split(":")[1];
      await bot.answerCallbackQuery(query.id);
      await this.handleNotify(bot, chatId, type);
      return;
    }

    await bot.answerCallbackQuery(query.id, { text: "未知操作" });
  }

  private async handleNotify(bot: TelegramBot, chatId: number, type: string): Promise<void> {
    switch (type) {
      case "energy_success":
        await bot.sendMessage(chatId,
          `🎉 <b>能量租赁成功</b>\n\n` +
          `接收地址:  <code>TSUEitrCqEn9VU7aoYe9cnQnugYTeBDdR1</code>\n` +
          `预付款:  <b>-5.00 TRX</b>\n` +
          `租用:  <b>131,000</b> 能量\n` +
          `当前余额:  <b>6,465.70 TRX</b>\n\n` +
          `⚠️ 请在 60 分钟内使用能量`,
          { parse_mode: "HTML" },
        );
        break;

      case "occupy_fee":
        await bot.sendMessage(chatId,
          `📌 <b>托管占用费扣款</b>\n\n` +
          `开始时间:  06-27 13:51\n` +
          `结束时间:  06-27 15:26\n` +
          `计划ID:  <code>#188150</code>\n\n` +
          `扣款金额:  <b>-0.40 TRX</b>\n` +
          `当前余额:  <b>948.70 TRX</b>`,
          { parse_mode: "HTML" },
        );
        break;

      case "refund":
        await bot.sendMessage(chatId,
          `📌 <b>余额返还</b>\n\n` +
          `订单号:  <code>#188163</code>\n` +
          `预付款:  <b>-5.20 TRX</b>\n` +
          `返还金额:  <b>+2.50 TRX</b>\n` +
          `当前余额:  <b>959.10 TRX</b>`,
          { parse_mode: "HTML" },
        );
        break;

      case "custody_deduct":
        await bot.sendMessage(chatId,
          `🤖 <b>托管扣款</b>\n\n` +
          `订单号:  <code>#188175</code>\n` +
          `类型:  能量（带宽同步）\n` +
          `数量:  <b>2 笔</b>（131,000 能量）\n` +
          `接收地址:  <code>TSUEitrCqEn9VU7aoYe9cnQnugYTeBDdR1</code>\n` +
          `预付款:  <b>-5.20 TRX</b>\n` +
          `当前余额:  <b>953.90 TRX</b>`,
          { parse_mode: "HTML" },
        );
        break;

      case "occupy_fee_2":
        await bot.sendMessage(chatId,
          `📌 <b>托管占用费扣款</b>\n\n` +
          `开始时间:  06-27 13:51\n` +
          `结束时间:  06-27 15:26\n` +
          `计划ID:  <code>#188150</code>\n\n` +
          `扣款金额:  <b>-0.40 TRX</b>\n` +
          `当前余额:  <b>948.70 TRX</b>`,
          { parse_mode: "HTML" },
        );
        break;

      case "duration_arrival":
        await bot.sendMessage(chatId,
          `✅ <b>能量到账</b>\n\n` +
          `类型:  能量\n` +
          `数量:  <b>65,500</b>\n` +
          `接收地址:  <code>TSUEitrCqEn9VU7aoYe9cnQnugYTeBDdR1</code>\n` +
          `扣款金额:  <b>-2.50 TRX</b>\n` +
          `当前余额:  <b>996.93 TRX</b>`,
          { parse_mode: "HTML" },
        );
        break;

      case "recharge":
        await bot.sendMessage(chatId,
          `✅ <b>充值到账</b>\n\n` +
          `充值金额:  <b>+5.62 TRX</b>\n` +
          `当前余额:  <b>14.51 TRX</b>\n\n` +
          `可用余额已更新`,
          { parse_mode: "HTML" },
        );
        break;
    }
  }
}
