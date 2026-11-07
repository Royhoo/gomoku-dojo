/**
 * 云服务公开配置。
 *
 * 这三项都是可以出现在浏览器里的公开值：publishableKey 只用于标识「是哪个应用」，
 * 本身不带任何权限，服务端还会校验请求来源必须是本应用的发布域名。
 * 真正的环境 id 与后端密钥只存在于服务端，不会下发到这里。
 *
 * 值来自开通云服务时返回的 publicConfig，不要手改、也不要改成从 location 推断——
 * endpoint 必须与应用发布域名一致，否则服务端会因为 Origin 不匹配拒绝请求。
 */
export const CLOUD_CONFIG = {
  endpoint: "https://gomoku-dojo-67873.app.workbuddy.host",
  oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
  publishableKey: "wbpk_PXNdO6iW0quY2k7YsUwFbx_5tDWUnYBgSvYbtu1QiB7q4cUWJunPhFd",
} as const;
