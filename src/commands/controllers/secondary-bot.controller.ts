import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { Message, CallbackQuery } from "node-telegram-bot-api";
import { MenuTextConstants } from "../../common/constants/menu-text.constants";
import { createSecondaryMenuKeyboard } from "../../utils/keyboard.util";
import {
  createAddressKeyboard,
  createPersonalCenterKeyboard,
  createSmartCustodyKeyboard,
  createDurationLeaseKeyboard,
  createEnergyRentKeyboard,
  createStartKeyboard,
  createRechargeKeyboard, createAddressManageKeyboard,
  createNotificationKeyboard,
  createBatchPackageKeyboard,
} from "../../utils/inline-keyboard.util";

@Injectable()
export class SecondaryBotController {
  private readonly logger = new Logger(SecondaryBotController.name);
  private readonly pendingLeaseOrders = new Map<number, { batchCount: string; energy: string; fee: string }>();

  constructor() {}

  // ==================== 命令处理 ====================

  async handleStart(bot: TelegramBot, msg: Message): Promise<void> {
    const chatId = msg.chat.id;

    const welcomeMessage =
      `欢迎使用 TRX 能量助手\n\n` +
      `一键租赁波场能量，低成本，秒到账。\n\n` +
      `<b>【主要功能】</b>\n\n` +
      `💱 U 兑换 T — 自动汇率，转账即换\n\n` +
      `⚡️ 能量闪租 — 转账即得能量，1小时有效\n\n` +
      `🤖 智能托管 — 地址自动补能，按次+占用+包带宽\n\n` +
      `🕹 快捷指令 — 快速下单，自动判断对方U情况\n\n` +
      `👤 个人中心 — 查看账户信息`;

    try {
      // 先设置底部持久菜单键盘，再发送欢迎消息
      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: "HTML",
        reply_markup: createSecondaryMenuKeyboard(),
        disable_web_page_preview: true,
      });
      this.logger.log(`用户 ${msg.from?.id} 启动了机器人`);
    } catch (error) {
      this.logger.error(`发送欢迎消息失败 (chatId: ${chatId}):`, error);
      await bot.sendMessage(chatId, `欢迎使用机器人！`);
    }
  }

  async handleHelp(bot: TelegramBot, msg: Message): Promise<void> {
    const chatId = msg.chat.id;

    const helpText =
      `🤖 <b>TRX 能量助手 - 使用帮助</b>\n\n` +
      `<b>📋 菜单功能：</b>\n` +
      `🔹 💱 USDT兑换TRX\n` +
      `🔹 🤖 智能托管\n` +
      `🔹 ⚡ 能量闪租\n` +
      `🔹 🔋 时长租赁\n` +
      `🔹 🕹 指令租能量\n` +
      `🔹 👤 个人中心\n` +
      `🔹 📢 通知消息\n\n` +
      `<b>⌨️ 命令：</b>\n` +
      `/start - 启动机器人\n\n` +
      `💡 点击下方菜单按钮体验！`;

    await bot.sendMessage(chatId, helpText, { parse_mode: "HTML" });
    this.logger.log(`用户 ${msg.from?.id} 查看了帮助`);
  }

  // ==================== 菜单文本处理 ====================

  async handleMenuText(bot: TelegramBot, msg: Message): Promise<boolean> {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return false;

    switch (text) {
      case MenuTextConstants.USDT_TO_TRX:
        await this.handleUsdtToTrx(bot, chatId);
        return true;
      case MenuTextConstants.SMART_CUSTODY:
        await this.handleSmartCustody(bot, chatId);
        return true;
      case MenuTextConstants.ENERGY_RENT:
        await this.handleEnergyRent(bot, chatId);
        return true;
      case MenuTextConstants.PERSONAL_CENTER:
        await this.handlePersonalCenter(bot, chatId, msg);
        return true;
      case MenuTextConstants.DURATION_LEASE:
        await this.handleDurationLease(bot, chatId);
        return true;
      case MenuTextConstants.CMD_ENERGY:
        await this.handleCmdEnergy(bot, chatId);
        return true;
      case MenuTextConstants.BATCH_PACKAGE:
        await this.handleBatchPackage(bot, chatId);
        return true;
      case MenuTextConstants.NOTIFICATION:
        await this.handleNotification(bot, chatId);
        return true;
      default:
        if (/^\d+(\.\d+)?$/.test(text)) {
          await this.handleRechargeAmount(bot, chatId, text, "TRX");
          return true;
        }
        // TRC20 地址输入 → 时长租赁订单 / 指令租能量下单
        if (/^T[A-Za-z0-9]{33}$/.test(text)) {
          const order = this.pendingLeaseOrders.get(chatId);
          if (order) {
            this.pendingLeaseOrders.delete(chatId);
            const orderId = Math.floor(100000000 + Math.random() * 900000000);
            const msg =
              `⏰ <b>时长租赁订单详情</b>\n` +
              `➖➖➖➖➖➖➖➖➖➖\n\n` +
              `租赁时长：1小时\n` +
              `能量笔数：${order.batchCount} 笔 (${order.energy} 能量)\n` +
              `单笔费用：2.50 TRX\n` +
              `订单金额：${order.fee} TRX\n` +
              `接收地址：<code>${text}</code>`;
            await bot.sendMessage(chatId, msg, {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "💳 余额支付", callback_data: "lease:pay_balance" },
                    { text: "❌ 取消订单", callback_data: "action:close" },
                  ],
                ],
              },
            });
            this.logger.log(`用户 ${chatId} 创建时长租赁订单 ${orderId}: ${order.batchCount}笔`);
            return true;
          }
          // 无待支付订单 → 指令租能量下单，余额不足
          await bot.sendMessage(chatId,
            `❌ 余额不足，请先充值`,
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

  private async handleBatchPackage(bot: TelegramBot, chatId: number): Promise<void> {
    const text =
      `🔥 <b>笔数套餐</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      ` 不限时间、不限地址，用1笔扣1笔\n` +
      ` 带宽套餐，每日低消仅 5K 带宽，至少可省 50% 带宽费\n` +
      ` 越用越划算，专为高频交易地址量身打造\n` +
      ` 托管自动防护，避免错转误转\n\n` +
      `<b>👇 选择套餐</b>\n` +
      `20笔  =  <b>3.7 TRX</b>/笔\n` +
      `30笔  =  <b>3.7 TRX</b>/笔\n` +
      `50笔  =  <b>3.7 TRX</b>/笔\n` +
      `100笔 =  <b>3.6 TRX</b>/笔\n` +
      `200笔 =  <b>3.6 TRX</b>/笔\n` +
      `300笔 =  <b>3.6 TRX</b>/笔\n` +
      `500笔 =  <b>3.5 TRX</b>/笔\n` +
      `1000笔 = <b>3.5 TRX</b>/笔\n` +
      `2000笔 = <b>3.5 TRX</b>/笔\n\n` +
      `剩余带宽：<b>0</b>\n` +
      `剩余笔数：<b>0</b> 笔\n\n` +
      `⚡️如需帮助，请联系客服：<a href="https://t.me/trxenio">@trxenio</a>`;
    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createBatchPackageKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询笔数套餐`);
  }

  private async handleRechargeAmount(bot: TelegramBot, chatId: number, amount: string, currency: string): Promise<void> {
    const orderId = Math.floor(100000000 + Math.random() * 900000000);
    const transferAmount = (parseFloat(amount) * (1 + Math.random() * 0.02)).toFixed(4);
    const address = "TUgS2mTW7wbhqnaHgA4PWLrfEYZB5nHHwH";
    const amountText = `${transferAmount}`;
    const msg =
      `<b>💰 你正在进行充值</b>\n\n` +
      `订单编号：${orderId}\n` +
      `支付币种：${currency}\n\n` +
      `转账地址：\n` +
      `<code>${address}</code>\n\n` +
      `转账金额：<code>${amountText}</code> ${currency}\n\n` +
      `<b>⚠️ 注意：</b>\n` +
      `🔹 请严格按照以上金额转账，否则无法自动到账\n` +
      `🔹 订单有效期 14 分钟`;
    await bot.sendMessage(chatId, msg, { parse_mode: "HTML" });
    this.logger.log(`用户 ${chatId} 发起 ${currency} 充值: ${amount}`);
  }

  private async handleUsdtToTrx(bot: TelegramBot, chatId: number): Promise<void> {
    const msg =
      `💱 <b>USDT 兑换 TRX</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `转账 USDT 到兑换地址，自动按当前汇率返回 TRX 到你的转账地址。\n` +
      `当前汇率：1 USDT = 3.05 TRX\n\n` +
      `🐬 兑换地址（点击复制）：\n` +
      `<code>TYzZxa2A8LsRKjq9LgqQ7yWyz1zEJNthD4</code>\n\n` +
      `<b>⚠️ 注意：</b>\n` +
      ` 交易所转账请提前说明\n` +
      ` 如需转回其他地址请提前说明`;
    await bot.sendMessage(chatId, msg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💁 联系客服", url: "https://t.me/trxenio" }],
        ],
      },
    });
    this.logger.log(`用户 ${chatId} 查询 USDT兑换TRX`);
  }

  private async handleSmartCustody(bot: TelegramBot, chatId: number): Promise<void> {
    const msg =
      `🤖<b>智能托管说明</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `适合每日多次转账的高频用户。地址始终保持能量状态，低于即补，无需每次手动购买，直接转账即可。\n\n` +
      `💰<b>资费标准</b>\n` +
      `<b>转账费（按次扣除）：</b>\n` +
      `6.55 万能量 ➡️ 2.50 TRX / 笔 (对方有 U)\n` +
      `13.1 万能量 ➡️ 5.00 TRX / 笔 (对方无 U 或交易所)\n` +
      `<b>占用费：</b>0.10 TRX / 小时 (按实际占用时长计算)\n\n` +
      `🚀 <b>使用步骤</b>\n` +
      `<b>充值：</b>确保机器人账户内 TRX 余额充足。\n` +
      `<b>开通：</b>点击下方 [ 新增地址 ]，选择能量规格并输入地址即可。\n\n` +
      `📌 <b>规则要点</b>\n` +
      `<b>低于即补：</b>能量消耗后系统自动补满。\n` +
      `<b>随开随关：</b>可随时关闭托管，关闭后不再扣费。\n` +
      `<b>自动关闭：</b>若 24 小时内未转账，系统将自动关闭托管。\n` +
      `➖➖➖➖➖➖➖➖➖➖\n` +
      `<b>账户余额：</b>0.00 TRX (<code>余额不足，请先充值</code>)`;
    await bot.sendMessage(chatId, msg, {
      parse_mode: "HTML",
      reply_markup: createSmartCustodyKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询智能托管`);
  }

  private async handleEnergyRent(bot: TelegramBot, chatId: number): Promise<void> {
    const msg =
      `<b>⚡️ 能量闪租</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `转账以下金额到收款地址，立即获得能量（谁转账谁得）：\n\n` +
      ` 转账 2.5 TRX → 1 笔（65,500 能量）\n` +
      ` 转账 5.0 TRX → 2 笔（131,000 能量）\n` +
      ` 转账 7.5 TRX → 3 笔（196,500 能量）\n` +
      ` 转账 10.0 TRX → 4 笔（262,000 能量）\n` +
      ` 转账 12.5 TRX → 5 笔（327,500 能量）\n\n` +
      `🐬 收款地址（点击复制）：\n` +
      `<code>TBshqZcsq8C6zN38BZeri8E8TjgiqcswLF</code>\n\n` +
      `<b>⚠️ 温馨提示：</b>\n` +
      ` 请在 1 小时内使用，过期回收\n` +
      ` 对方无 U 或转账至交易所，需租 2 笔`;
    await bot.sendMessage(chatId, msg, {
      parse_mode: "HTML",
      reply_markup: createEnergyRentKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询能量闪租`);
  }

  private async handlePersonalCenter(bot: TelegramBot, chatId: number, msg: Message): Promise<void> {
    const userId = msg.from?.id || chatId;
    const username = msg.from?.username || msg.from?.first_name || "未知";
    const text =
      `👤 <b>个人中心</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `用户ID：${userId}\n\n` +
      `Telegram ID：${chatId}\n` +
      `用户名：${username}\n\n` +
      `余额：0.00 TRX`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: createPersonalCenterKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查看个人中心`);
  }

  private async handleDurationLease(bot: TelegramBot, chatId: number): Promise<void> {
    const msg =
      `<b>🔋 时长租赁</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `租用能量，转账无需 TRX 消耗，0 手续费！\n` +
      `⚠️ 提示：对未激活地址转账，手续费需要双倍`;
    await bot.sendMessage(chatId, msg, {
      parse_mode: "HTML",
      reply_markup: createDurationLeaseKeyboard(),
    });
    this.logger.log(`用户 ${chatId} 查询时长租赁`);
  }

  private async handleCmdEnergy(bot: TelegramBot, chatId: number): Promise<void> {
    const msg =
      `🤖 <b>指令租能量</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `💵 每笔指令费用：2.2 TRX\n` +
      `👤 当前账户余额：0.00 TRX\n\n` +
      `<b>扣费与返还规则</b>\n` +
      `• 接收方地址 无 U ➡️ 扣除 4.4 TRX（系统自动补足全额能量）\n` +
      `• 接收方地址 有 U ➡️ 预扣 4.4 TRX（交易成功后自动返还 2.2 TRX，实际仅收 2.2 TRX）\n` +
      `⏳ 租用的能量有效期为 1 小时，下单后请尽快完成转账，避免过期。\n\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `<b>快捷指令使用说明</b>\n\n` +
      `为了提高您的转账效率，本机器人支持 "数字指令" 快速下单：\n` +
      `<b>绑定地址：</b>点击下方 [ 添加地址 ] 绑定您的常用波场地址。\n` +
      `<b>获取指令：</b>绑定成功后，地址后方会生成专属的数字编号（例如：指令:11、指令:22）。\n` +
      `<b>快速下单：</b>在聊天框中直接发送对应的数字（例如直接发送 11 或 22），系统将自动为您绑定的该地址秒级注入能量，无需再点击按钮。\n` +
      `👇 请选择地址下单（或直接发送指令数字）👇`;

    await bot.sendMessage(chatId, msg, {
      parse_mode: "HTML",
      reply_markup: createAddressManageKeyboard()
    });
    this.logger.log(`用户 ${chatId} 查询指令租能量`);
  }

  private async sendRechargeMessage(bot: TelegramBot, chatId: number): Promise<void> {
    await bot.sendMessage(chatId,
      `<b>💰 余额充值</b>\n` +
      `➖➖➖➖➖➖➖➖➖➖\n\n` +
      `请选择充值金额：\n\n` +
      `<b>⚠️ 温馨提示：</b>\n` +
      `选择 USDT 充值将自动按汇率兑换为 TRX\n` +
      `当前汇率：1 USDT = 3.05 TRX`,
      {
        parse_mode: "HTML",
        reply_markup: createRechargeKeyboard(),
      },
    );
  }

  

  private async handleNotification(bot: TelegramBot, chatId: number): Promise<void> {
    await bot.sendMessage(chatId,
      `📢 <b>通知消息</b>

请选择要发送的通知类型：`,
      {
        parse_mode: "HTML",
        reply_markup: createNotificationKeyboard(),
      },
    );
    this.logger.log(`用户 ${chatId} 查看通知消息`);
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
      await bot.answerCallbackQuery(query.id, { text: "消息已关闭" });
      return;
    }

    // 联系客服（旧版回调，新版已改用 url）
    if (data === "action:contact") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, "客服联系方式: @support_bot");
      return;
    }

    // 确认/取消
    if (data.startsWith("confirm:")) {
      const action = data.split(":")[1];
      if (action === "yes") {
        await bot.sendMessage(chatId, "✅ 操作已确认");
      } else {
        await bot.sendMessage(chatId, "❌ 操作已取消");
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
          `💰 <b>自定义充值</b>\n\n请输入您要充值的 TRX 金额：`,
          { parse_mode: "HTML" },
        );
        return;
      }
      if (option === "custom_usdt") {
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId,
          `💰 <b>自定义充值</b>\n\n请输入您要充值的 USDT 金额：`,
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
          `📍 输入接收地址：`,
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
        `📋 <b>地址管理</b>\n\n请选择要管理的地址：`,
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
        `请选择托管套餐：`,
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
      await bot.sendMessage(chatId,
        `📍 请输入接收地址：`,
        { parse_mode: "HTML" },
      );
      return;
    }

    // 时长租赁
    if (data.startsWith("lease:")) {
      const option = data.split(":")[1];
      if (option === "1h_pay") {
        await bot.answerCallbackQuery(query.id);
        return;
      }
      if (option === "pay_balance") {
        await bot.answerCallbackQuery(query.id, { text: "✅ 支付成功！能量已下发到您的地址。" });
        await bot.sendMessage(chatId, "✅ ✅ 支付成功！能量已下发到您的地址。");
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
          `📍 请输入接收地址：`,
          { parse_mode: "HTML" },
        );
        return;
      }
      const leaseNames: Record<string, string> = {
        "10min": "10分钟",
        "1h": "1小时",
        "3h": "3小时",
        "1d": "1天",
        "2d": "2天",
        "3d": "3天",
        "otheraddr": "请输入其他地址",
        pay: "余额支付功能开发中，请稍后...",
      };
      const text = leaseNames[option] || "未知选项";
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, text);
      return;
    }

    // 个人中心
    if (data === "buy_trx") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, "⏳ 购买 TRX 功能开发中，请稍后...");
      return;
    }

    // 地址管理
    if (data === "addr:active") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🟢 <b>开启中的地址</b>\n暂无开启中的地址。`,
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
        `🔴 <b>关闭中的地址</b>\n暂无关闭中的地址。`,
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
        `✅ <b>开启全部托管</b>\n没有可一键开启的地址（均已开启或无快捷记录）。`,
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
        `⛔ <b>关闭全部托管</b>\n没有可一键关闭的地址（均已关闭或无快捷记录）。`,
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
        `📍 请输入要添加的接收地址：`,
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

    if (data === "addr:deleteAuto") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🗑 <b>删除地址</b>\n\n如需删除开启中的地址请先关闭该地址\n\n请选择需要删除的地址：`,
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

    if (data === "addr:delete") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `🗑 <b>删除地址</b>\n请选择要删除的地址：`,
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

    if (data === "nav:cmd_energy") {
      await bot.answerCallbackQuery(query.id);
      await this.handleCmdEnergy(bot, chatId);
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

    if (data === "addr:send") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId,
        `📍 请输入接收地址：`,
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

    // 启动页
    if (data === "start:bind") {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, "📍 请输入要绑定/更换的 TRC20 地址：");
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
          `🎉🎉能量租赁成功🎉🎉\n\n` +
          `🔥接收地址：<code>TSUEitrCqEn9VU7aoYe9cnQnugYTeBDdR1</code>\n` +
          `🔥预 付 款：5\n` +
          `🔥可用余额：6,465.7\n` +
          `🔥租用数量：131,000\n` +
          `🔥扣费规则：对方有 U，费用自动返半\n\n` +
          `提示：请在 60 分钟内使用能量，以免造成不必要的浪费！`,
          { parse_mode: "HTML" },
        );
        break;

      case "occupy_fee":
        await bot.sendMessage(chatId,
          `📌 托管占用费扣款通知\n\n` +
          `开始时间：06-27 13:51:00\n` +
          `结束时间：06-27 15:26:03\n` +
          `计划ID：188150\n` +
          `扣款金额：-0.40 TRX\n` +
          `当前余额：948.70 TRX`,
          { parse_mode: "HTML" },
        );
        break;

      case "refund":
        await bot.sendMessage(chatId,
          `📌 余额返还通知\n\n` +
          `订单号：188163\n` +
          `预付款：5.20 TRX\n` +
          `返还金额：+2.50 TRX\n` +
          `当前余额：959.10 TRX`,
          { parse_mode: "HTML" },
        );
        break;

      case "custody_deduct":
        await bot.sendMessage(chatId,
          `🤖 智能托管扣款通知\n\n` +
          `订单号：188175\n` +
          `类型：能量（带宽已同步发送）\n` +
          `数量：2 笔（131,000 能量）\n` +
          `目标地址：<code>TSUEitrCqEn9VU7aoYe9cnQnugYTeBDdR1</code>\n` +
          `预付款：5.20\n` +
          `余额：953.9 TRX`,
          { parse_mode: "HTML" },
        );
        break;

      case "occupy_fee_2":
        await bot.sendMessage(chatId,
          `📌 托管占用费扣款通知\n\n` +
          `开始时间：06-26 13:50:11\n` +
          `结束时间：06-27 13:51:00\n` +
          `计划ID：188150\n` +
          `扣款金额：-4.80 TRX\n` +
          `当前余额：949.10 TRX`,
          { parse_mode: "HTML" },
        );
        break;

      case "duration_arrival":
        await bot.sendMessage(chatId,
          `✅ 时长订单到账通知\n` +
          `类型：能量\n` +
          `数量：65,500\n` +
          `目标地址：<code>TSUEitrCqEn9VU7aoYe9cnQnugYTeBDdR1</code>\n` +
          `金额：2.5 TRX\n` +
          `余额：996.93 TRX`,
          { parse_mode: "HTML" },
        );
        break;

      case "recharge":
        await bot.sendMessage(chatId,
          `✅ 充值到账\n` +
          `➖➖➖➖➖➖➖➖➖➖\n\n` +
          `金额：+5.62 TRX\n` +
          `当前余额：14.51 TRX\n\n` +
          `可用余额已更新，可继续使用各项功能。`,
          { parse_mode: "HTML" },
        );
        break;
    }
  }
}
