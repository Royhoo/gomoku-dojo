/**
 * 学习进度的云端同步。
 *
 * 数据模型：learning_progress 每（用户 × 章节）一行，记 step 和 completed。
 * owner_id 由数据库的 DEFAULT auth.uid() 填，前端不传、也不该传；
 * 行级安全策略保证只能看见和修改自己的行。
 *
 * 同步策略是「本机为准，云端合流」：
 *   - 每次翻页把位置推上去（1.5 秒防抖，避免连点多发请求）
 *   - 学完一章立刻推，不等防抖
 *   - 登录后拉一次云端，和本机取并集，再把并集写回去
 * 网络失败不弹错、不打断学习：进度本来就还在本机，下次登录会再合流。
 */

import { getCloud } from "./cloud";
import { getAccount } from "./auth";
import { getProgress, mergeProgress, replaceProgress, type Progress } from "./progress";

const TABLE = "learning_progress";
const DEBOUNCE_MS = 1500;

interface Row {
  opening_id: string;
  lesson_id: string;
  step: number;
  completed: boolean;
  updated_at: string;
}

function isSignedIn(): boolean {
  return getAccount() !== null;
}

/** 拉取本用户的全部进度；未登录或出错返回 null（调用方按「无云端数据」处理） */
export async function pullProgress(): Promise<Progress | null> {
  const cloud = getCloud();
  if (!cloud || !isSignedIn()) return null;

  const { data, error } = await cloud.database
    .from(TABLE)
    .select("opening_id, lesson_id, step, completed, updated_at");

  if (error) return null;
  const rows = (data ?? []) as Row[];

  const done = rows.filter((r) => r.completed).map((r) => `${r.opening_id}/${r.lesson_id}`);

  let last: Progress["last"];
  for (const r of rows) {
    const at = Date.parse(r.updated_at);
    if (!last || at > last.at) {
      last = { openingId: r.opening_id, lessonId: r.lesson_id, step: r.step, at };
    }
  }

  return last ? { last, done } : { done };
}

/**
 * 写入一条进度。
 *
 * 先查后写，而不是 upsert：冲突目标包含 owner_id，而那一列由数据库默认值填充，
 * 交给 ON CONFLICT 去猜不如老实按「有没有这一行」分两路，行为更可预期。
 * 已完成的章节不会被后来的翻页操作降级回未完成。
 */
async function upsertEntry(
  openingId: string,
  lessonId: string,
  step: number,
  markCompleted: boolean,
): Promise<boolean> {
  const cloud = getCloud();
  if (!cloud || !isSignedIn()) return false;

  const { data: existing, error: readError } = await cloud.database
    .from(TABLE)
    .select("id, completed")
    .eq("opening_id", openingId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (readError) return false;

  const now = new Date().toISOString();
  const row = existing as { id: number; completed: boolean } | null;
  const name = getAccount()?.name ?? null;

  if (row) {
    const { error } = await cloud.database
      .from(TABLE)
      .update({
        step,
        completed: row.completed || markCompleted,
        updated_at: now,
        owner_name: name,
      })
      .eq("id", row.id);
    return !error;
  }

  const { error } = await cloud.database.from(TABLE).insert({
    opening_id: openingId,
    lesson_id: lessonId,
    step,
    completed: markCompleted,
    updated_at: now,
    owner_name: name,
  });
  return !error;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pendingLast: { openingId: string; lessonId: string; step: number } | null = null;

/** 翻页时调用：防抖上传当前位置 */
export function queueLastPosition(openingId: string, lessonId: string, step: number) {
  if (!isSignedIn()) return;
  pendingLast = { openingId, lessonId, step };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    const p = pendingLast;
    pendingLast = null;
    if (p) void upsertEntry(p.openingId, p.lessonId, p.step, false);
  }, DEBOUNCE_MS);
}

/** 学完一章时调用：立即上传，并标记完成 */
export function pushLessonCompleted(openingId: string, lessonId: string, step: number) {
  if (!isSignedIn()) return;
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
    pendingLast = null;
  }
  void upsertEntry(openingId, lessonId, step, true);
}

/**
 * 登录后合流：拉云端 → 与本机取并集 → 写回本地 → 把本机独有的进度补传上去。
 * 这样「先离线学了半章再登录」不会丢掉那半章。
 */
export async function adoptCloudProgress(): Promise<Progress | null> {
  const remote = await pullProgress();
  if (!remote) return null;

  const local = getProgress();
  const merged = mergeProgress(local, remote);
  replaceProgress(merged);

  const remoteDone = new Set(remote.done);
  for (const key of merged.done) {
    if (remoteDone.has(key)) continue;
    const [openingId, lessonId] = key.split("/");
    if (!openingId || !lessonId) continue;
    await upsertEntry(openingId, lessonId, 0, true);
  }

  if (merged.last && remote.last?.at !== merged.last.at) {
    await upsertEntry(
      merged.last.openingId,
      merged.last.lessonId,
      merged.last.step,
      merged.done.includes(`${merged.last.openingId}/${merged.last.lessonId}`),
    );
  }

  return merged;
}

/** 登录状态下清空本机缓存前，先把云端进度拉下来（供退出登录时使用） */
export async function refreshFromCloud(): Promise<void> {
  if (!isSignedIn()) return;
  const remote = await pullProgress();
  if (remote) replaceProgress(mergeProgress(getProgress(), remote));
}
