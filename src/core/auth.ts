/**
 * 登录态。
 *
 * 只提供一种登录方式：WorkBuddy 账号登录。
 * 走的是平台 Relay 的 OAuth 授权，前端不接触任何 AppSecret，也不需要自己拼授权地址。
 *
 * 几个必须做对的地方（做错就是「已经授权成功却登不进去」）：
 *   1. 回调必须在应用启动时处理，早于任何路由判断，否则页面先把地址栏擦掉了
 *   2. 回调后只删 code / state / provider，别把 ?sharecode= 和 #hash 一起丢掉
 *   3. 必须同标签页跳转——PKCE 凭证存在当前标签页的 sessionStorage 里
 */

import { getCloud } from "./cloud";
import { resetProgress } from "./progress";

export interface Account {
  id: string;
  name?: string;
  avatarUrl?: string;
}

type Listener = () => void;

const CALLBACK_KEYS = ["code", "state", "provider"] as const;

/** 本机进度属于哪个账号。设备共用时，换账号必须先清掉上一个人的本机副本。 */
const OWNER_KEY = "gomoku-dojo:owner:v1";

let account: Account | null = null;
let ready = false;
let errorMessage = "";
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccount(): Account | null {
  return account;
}
export function isAuthReady(): boolean {
  return ready;
}
export function getAuthError(): string {
  return errorMessage;
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function rememberOwner(id: string) {
  try {
    localStorage.setItem(OWNER_KEY, id);
  } catch {
    // 隐私模式写不了，最坏情况是共用设备时可能串一次进度，不影响主流程
  }
}

function setAccount(next: Account | null) {
  if (next) {
    const prev = readOwner();
    // 这台设备上换了一个账号：上一个人的本机进度不能合进新账号的云端数据。
    // 首次登录（prev 为空）不清——离线学的那部分要能带上去。
    if (prev && prev !== next.id) resetProgress();
    rememberOwner(next.id);
  }
  account = next;
  ready = true;
  emit();
}

/** 回调地址：站点根路径 + 业务参数（sharecode）+ hash 路由，全部保留 */
function buildRedirectTo(): string {
  const back = new URL(location.href);
  back.pathname = "/";
  for (const key of CALLBACK_KEYS) back.searchParams.delete(key);
  return back.toString();
}

export async function signIn(): Promise<void> {
  const cloud = getCloud();
  if (!cloud) {
    errorMessage = "云服务不可用，暂时无法登录";
    emit();
    return;
  }
  errorMessage = "";
  emit();

  const { data, error } = await cloud.auth.signInWithOAuth({
    provider: "workbuddy",
    redirectTo: buildRedirectTo(),
  });

  if (error || !data) {
    errorMessage = error?.message || "无法发起登录，请稍后再试";
    emit();
    return;
  }
  // 必须同标签页跳转，新开窗口会丢失 PKCE 凭证
  location.assign(data.url);
}

export async function signOut(): Promise<void> {
  const cloud = getCloud();
  if (!cloud) return;
  await cloud.auth.signOut();
  setAccount(null);
}

/**
 * 处理启动登录态：先看是不是 OAuth 回调，是就兑换会话；
 * 不是就恢复已有会话。必须早于任何路由守卫执行。
 */
export async function bootAuth(): Promise<void> {
  const cloud = getCloud();
  if (!cloud) {
    ready = true;
    emit();
    return;
  }

  const url = new URL(location.href);
  const hasCallback = url.searchParams.has("code") || url.searchParams.has("error");

  if (!hasCallback) {
    const { data } = await cloud.auth.getSession();
    setAccount(data?.user ? toAccount(data.user) : null);
    return;
  }

  const provider = url.searchParams.get("provider");
  if (provider !== "workbuddy" && provider !== "wechat") {
    errorMessage = "授权回调缺少有效的登录方式，请重新登录。";
    setAccount(null);
    return;
  }

  const { data, error } = await (provider === "workbuddy"
    ? cloud.auth.handleWorkBuddyCallback()
    : cloud.auth.handleWechatWebCallback());

  if (error) {
    errorMessage = error.message;
    setAccount(null);
    return;
  }
  if (!data) {
    // 没有拿到会话：当作普通访问，接着恢复已有会话
    const restored = await cloud.auth.getSession();
    setAccount(restored.data?.user ? toAccount(restored.data.user) : null);
    return;
  }

  for (const key of CALLBACK_KEYS) url.searchParams.delete(key);
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  setAccount(toAccount(data.user));
}

function toAccount(user: { id: string; name?: string; avatarUrl?: string }): Account {
  return { id: user.id, name: user.name, avatarUrl: user.avatarUrl };
}
