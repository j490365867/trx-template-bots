import type TelegramBot from "node-telegram-bot-api";

/**
 * 创建内联按钮键盘
 * Callback data 格式: "action:param1:param2"
 */
export function createInlineDemoKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "👍 点赞", callback_data: "reaction:like" },
        { text: "❤️ 喜欢", callback_data: "reaction:love" },
        { text: "😂 好笑", callback_data: "reaction:funny" },
      ],
      [
        { text: "🔗 打开链接", url: "https://t.me/test_bot" },
        { text: "💁 联系客服", callback_data: "action:contact" },
      ],
      [
        { text: "❌ 关闭", callback_data: "action:close" },
      ],
    ],
  };
}

export function createConfirmKeyboard(
  confirmText = "✅ 确认",
  cancelText = "❌ 取消",
): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: confirmText, callback_data: "confirm:yes" },
        { text: cancelText, callback_data: "confirm:no" },
      ],
    ],
  };
}

export function createRechargeKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "100 TRX", callback_data: "recharge:100trx" },
        { text: "200 TRX", callback_data: "recharge:200trx" },
        { text: "500 TRX", callback_data: "recharge:500trx" },
      ],
      [
        { text: "1000 TRX", callback_data: "recharge:1000trx" },
        { text: "2000 TRX", callback_data: "recharge:2000trx" },
        { text: "5000 TRX", callback_data: "recharge:5000trx" },
      ],
      [
        { text: "🟢 自定义TRX金额", callback_data: "recharge:custom_trx" },
      ],
      [
        { text: "30 U", callback_data: "recharge:30u" },
        { text: "50 U", callback_data: "recharge:50u" },
        { text: "100 U", callback_data: "recharge:100u" },
      ],
      [
        { text: "200U", callback_data: "recharge:200u" },
        { text: "500U", callback_data: "recharge:500u" },
        { text: "1000U", callback_data: "recharge:1000u" },
      ],
      [
        { text: "🔵 自定义USDT金额", callback_data: "recharge:custom_usdt" },
      ],
      [
        { text: "❌ 取消", callback_data: "action:close" },
      ],
    ],
  };
}

export function createSmartCustodyKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💰 余额充值", callback_data: "recharge" },
        { text: "📋 地址管理", callback_data: "trust:list" },
      ],
      [
        { text: "➕ 新增地址", callback_data: "trust:add" },
      ],
    ],
  };
}

export function createDurationLeaseKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      // [
      //   { text: "⬇️1小时套餐可余额支付⬇️", callback_data: "lease:1h_pay" },
      // ],
      [
        { text: "3笔", callback_data: "lease:3batch" },
        { text: "4笔", callback_data: "lease:4batch" },
        { text: "5笔", callback_data: "lease:5batch" },
        { text: "10笔", callback_data: "lease:10batch" },
        { text: "20笔", callback_data: "lease:20batch" },
      ],
      [
        { text: "1笔", callback_data: "lease:1batch" },
        { text: "2笔", callback_data: "lease:2batch" },
      ],
    ],
  };
}

export function createStartKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      // [
      //   { text: "💁 联系客服", url: "https://t.me/trxenio" },
      //   { text: "🔗 绑定/更换地址", callback_data: "start:bind" },
      // ],
    ],
  };
}

export function createEnergyRentKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💁 联系客服", url: "https://t.me/trxenio" },
      ],
    ],
  };
}

export function createPersonalCenterKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💰 余额充值", callback_data: "recharge" },
        { text: "💁 联系客服", url: "https://t.me/trxenio" },
      ],
      [
        { text: "🌐 进入 Web 后台 ", callback_data: "gotoWeb"}
      ]
    ],
  };
}

export function createAddressKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🟢 开启中的地址", callback_data: "addr:active" },
        { text: "🔴 关闭中的地址", callback_data: "addr:closed" },
      ],
      [
        { text: "✅ 开启全部托管", callback_data: "addr:enable_all" },
        { text: "⛔ 关闭全部托管", callback_data: "addr:disable_all" },
      ],
      [
        { text: "🗑 删除地址", callback_data: "addr:deleteAuto" },
      ],
      [
        { text: "🔙 返回", callback_data: "addr:back" },
      ],
    ],
  };
}

export function createAddressManageKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "➕ 添加地址", callback_data: "addr:add" },
        { text: "🗑 删除地址", callback_data: "addr:delete" },
      ],
      [
        { text: "发送地址，直接下单", callback_data: "addr:send" },
      ],
    ]
  }
}

export function createBatchPackageKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "10笔（3.00 TRX）", callback_data: "batch_pkg:select:10" },
        { text: "50笔（15.00 TRX）", callback_data: "batch_pkg:select:50" },
      ],
      [
        { text: "100笔（30.00 TRX）", callback_data: "batch_pkg:select:100" },
        { text: "300笔（90.00 TRX）", callback_data: "batch_pkg:select:300" },
      ],
      [
        { text: "500笔（150.00 TRX）", callback_data: "batch_pkg:select:500" },
        { text: "1000笔（300.00 TRX）", callback_data: "batch_pkg:select:1000" },
      ],
      [
        { text: "📋 我的笔数地址", callback_data: "batch_pkg:my_addresses" },
        { text: "➕ 添加地址", callback_data: "batch_pkg:add_address" },
      ],
      [
        { text: "❌ 取消", callback_data: "action:close" },
      ],
    ],
  };
}

export function createNotificationKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🎉 能量租赁成功", callback_data: "notify:energy_success" },
        { text: "📌 托管占用费扣款", callback_data: "notify:occupy_fee" },
      ],
      [
        { text: "📌 余额返还", callback_data: "notify:refund" },
        { text: "🤖 智能托管扣款", callback_data: "notify:custody_deduct" },
      ],
      [
        { text: "📌 托管占用费扣款2", callback_data: "notify:occupy_fee_2" },
        { text: "✅ 时长订单到账", callback_data: "notify:duration_arrival" },
      ],
      [
        { text: "✅ 充值到账", callback_data: "notify:recharge" },
        { text: "❌ 关闭", callback_data: "action:close" },
      ],
    ],
  };
}
