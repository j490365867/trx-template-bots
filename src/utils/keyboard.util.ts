import type TelegramBot from "node-telegram-bot-api";
import { MenuTextConstants, MainMenuTextConstants } from "../common/constants/menu-text.constants";

// 机器人1（主机器人）3列布局
export function createMainMenuKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return {
    keyboard: [
      [
        { text: MainMenuTextConstants.USDT_TO_TRX },
        { text: MainMenuTextConstants.BATCH_PACKAGE },
        { text: MainMenuTextConstants.SMART_CUSTODY },
      ],
      [
        { text: MainMenuTextConstants.ENERGY_RENT },
        { text: MainMenuTextConstants.DURATION_LEASE },
        { text: MainMenuTextConstants.CMD_ENERGY },
      ],
      [
        { text: MainMenuTextConstants.PERSONAL_CENTER },
        { text: MainMenuTextConstants.NOTIFICATION },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false,
    is_persistent: true,
  };
}

export function createSecondaryMenuKeyboard(): TelegramBot.ReplyKeyboardMarkup {
  return {
    keyboard: [
      [
        { text: MenuTextConstants.USDT_TO_TRX },
        { text: MenuTextConstants.SMART_CUSTODY },
      ],
      [
        { text: MenuTextConstants.BATCH_PACKAGE },
        { text: MenuTextConstants.ENERGY_RENT },
      ],
      [
        { text: MenuTextConstants.DURATION_LEASE },
        { text: MenuTextConstants.CMD_ENERGY },
      ],
      [
        { text: MenuTextConstants.PERSONAL_CENTER },
        { text: MenuTextConstants.NOTIFICATION },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false,
    is_persistent: true,
  };
}
