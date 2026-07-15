# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Telegram 机器人项目，基于 NestJS + `node-telegram-bot-api` 构建。支持键盘菜单按钮、内联按钮、Webhook 消息推送，使用模拟 JSON 数据运行。

## Common Commands

- **Install**: `npm install`
- **Dev**: `npm run start:dev` (ts-node-dev, 热重载)
- **Build**: `npm run build` (tsc -p tsconfig.build.json)
- **Prod**: `npm run start:prod` (node dist/main.js)
- **Type check**: `npx tsc --noEmit`

## Architecture

```
src/
├── main.ts                    # 入口：创建 NestJS HTTP 服务
├── app.module.ts              # 根模块
├── app.controller.ts          # POST /webhook (Telegram 更新入口)
├── bot/
│   ├── bot.module.ts
│   └── bot.service.ts         # Bot 生命周期管理，支持 polling/webhook 双模式
├── commands/
│   ├── commands.module.ts
│   ├── commands.service.ts    # Facade
│   ├── command-registry.service.ts  # 命令注册分发
│   ├── interfaces/
│   │   └── command-handler.interface.ts
│   └── handlers/
│       ├── start.command.ts         # /start 欢迎菜单
│       ├── help.command.ts          # /help
│       ├── inline-demo.command.ts   # /inline 内联按钮演示
│       ├── json.command.ts          # /json 模拟 JSON 数据
│       └── menu-handler.command.ts  # 键盘菜单按钮文本匹配处理
├── mock/
│   ├── mock-data.module.ts
│   └── mock-data.service.ts   # 模拟数据服务（天气、新闻、段子、翻译、通用 JSON）
├── common/
│   ├── constants/menu-text.constants.ts  # 菜单按钮文案
│   └── exceptions/business.exception.ts
└── utils/
    ├── keyboard.util.ts       # 底部持久 ReplyKeyboard 构造
    ├── inline-keyboard.util.ts # 消息内 InlineKeyboard 构造
    └── proxy.util.ts          # 代理配置（支持 HTTP/SOCKS5）
```

## Key Patterns

- **ICommandHandler** 接口：每个命令一个类，定义 `command` / `description` / `pattern` / `handle()`
- **Registry 模式**：`CommandRegistryService` 统一注册和管理所有命令，绑定到 bot 事件
- **双模式启动**：`BOT_MODE` 环境变量控制 polling（开发）或 webhook（生产）
- **内联按钮回调**：callback_data 格式 `action:param`，统一在 `InlineDemoCommand.handleCallback()` 处理
- **菜单按钮**：文本匹配 `MenuHandlerCommand.handleMenuText()`，将键盘按钮点击映射到对应功能
- **Mock 数据**：`MockDataService` 提供全部模拟数据，无外部依赖即可运行

## Environment Variables (.env)

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot Token (必填) |
| `BOT_MODE` | polling / webhook |
| `WEBHOOK_URL` | Webhook 模式下的公网 URL |
| `PORT` | HTTP 服务端口 (默认 3000) |
| `PROXY_ENABLED` | 是否启用代理 (默认 true) |
| `PROXY_HOST` | 代理主机地址 (默认 127.0.0.1) |
| `HTTP_PROXY_PORT` | HTTP 代理端口 (默认 33210) |
| `SOCKS_PROXY_PORT` | SOCKS5 代理端口 (默认 33211) |
