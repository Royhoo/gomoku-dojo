/**
 * 云服务客户端。
 *
 * 全应用只初始化一次，登录态、数据库、存储共用同一个实例：
 * 登录之后，同源的数据库请求会自动带上当前会话，业务代码不需要手工传 token，
 * 也不允许手工传 owner_id——那一列由数据库的 DEFAULT auth.uid() 填，RLS 兜底。
 *
 * 初始化失败（离线、旧浏览器、App 内 file:// 环境）不让整个页面挂掉：
 * 取到 null 就退回纯本地模式，学习功能照常可用。
 */

import { createWorkBuddyCloud, type WorkBuddyCloudClient } from "@tencent-ai/workbuddy-cloud-sdk";
import { CLOUD_CONFIG } from "./cloudConfig";
import type { Database } from "./database.types";

let client: WorkBuddyCloudClient<Database> | null = null;
let initError = "";

/**
 * 本地开发时把 endpoint 指成当前源，让请求走 dev server 的反代（见 vite.config.ts）：
 * 浏览器看到的是同源请求，不触发跨域；代理转发时把 Origin 还原成发布域名，
 * 服务端才认。生产构建仍用发布域名，逻辑完全一致。
 */
function resolveEndpoint(): string {
  if (import.meta.env.DEV && typeof location !== "undefined") return location.origin;
  return CLOUD_CONFIG.endpoint;
}

export function getCloud(): WorkBuddyCloudClient<Database> | null {
  if (client) return client;
  try {
    client = createWorkBuddyCloud<Database>({
      endpoint: resolveEndpoint(),
      oauthRelayBaseUrl: CLOUD_CONFIG.oauthRelayBaseUrl,
      publishableKey: CLOUD_CONFIG.publishableKey,
    });
    return client;
  } catch (e) {
    initError = e instanceof Error ? e.message : "云服务初始化失败";
    return null;
  }
}

export function getCloudInitError(): string {
  return initError;
}
