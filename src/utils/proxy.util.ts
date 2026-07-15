/**
 * 配置代理环境变量
 * node-telegram-bot-api 底层使用 @cypress/request，
 * 该库会自动读取 HTTP_PROXY / HTTPS_PROXY 环境变量
 */
export function setupProxyEnv(): void {
  const enabled = process.env.PROXY_ENABLED !== "false";
  if (!enabled) return;

  const host = process.env.PROXY_HOST || "127.0.0.1";
  const httpPort = process.env.HTTP_PROXY_PORT || "33210";

  const proxyUrl = `http://${host}:${httpPort}`;

  // @cypress/request 拾取 HTTP_PROXY / HTTPS_PROXY 自动使用代理
  process.env.HTTP_PROXY = proxyUrl;
  process.env.HTTPS_PROXY = proxyUrl;

  console.log(`[Proxy] 已配置代理: ${proxyUrl}`);
}
