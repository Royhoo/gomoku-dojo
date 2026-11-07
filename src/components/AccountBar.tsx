/**
 * 进度同步状态条。
 *
 * 不登录也能完整使用——这句话要写在界面上，而不是藏在文档里。
 * 登录只多一件事：换设备时把进度带过去。
 */

import { useSyncExternalStore } from "react";
import { Button, Card } from "./ui";
import {
  getAccount,
  getAuthError,
  isAuthReady,
  signIn,
  signOut,
  subscribeAuth,
} from "../core/auth";

export function AccountBar() {
  const account = useSyncExternalStore(subscribeAuth, getAccount);
  const ready = useSyncExternalStore(subscribeAuth, isAuthReady);
  const error = useSyncExternalStore(subscribeAuth, getAuthError);

  if (!ready) {
    return (
      <Card className="mb-3 px-4 py-3">
        <span className="text-[12.5px] text-[var(--color-ink-faint)]">正在检查登录状态…</span>
      </Card>
    );
  }

  return (
    <Card className="mb-3 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          {account ? (
            <>
              <p className="flex items-center gap-1.5 text-[13.5px]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-pine)]" />
                进度已同步
                {account.name ? (
                  <span className="truncate text-[var(--color-ink-soft)]">· {account.name}</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
                换设备登录同一个 WorkBuddy 账号，就能接着上次的章节学。
              </p>
            </>
          ) : (
            <>
              <p className="text-[13.5px]">进度只存在这台设备上</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
                不登录也能完整学完所有课程；登录后会与云端合并，换设备可接着学。
              </p>
            </>
          )}
        </div>

        {account ? (
          <Button size="sm" variant="ghost" onClick={() => void signOut()}>
            退出登录
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => void signIn()}>
            使用 WorkBuddy 登录
          </Button>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-cinnabar)]">{error}</p>
      ) : null}
    </Card>
  );
}
