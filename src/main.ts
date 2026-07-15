import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupProxyEnv } from "./utils/proxy.util";

// 在 NestJS 启动之前设置代理环境变量
// 确保 node-telegram-bot-api 底层 @cypress/request 库可拾取
setupProxyEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "debug", "error", "warn", "verbose"],
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Bot service started on port ${port}`);
}

bootstrap().catch((err) => {
  console.error("Bot bootstrap error", err);
});
