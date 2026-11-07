/**
 * 学习进度。
 *
 * 两件事：上次看到哪、哪些章节走完了。
 *
 * 本机永远是第一落点（localStorage）：没登录也能学，断网也能学，进度不会因为
 * 云端不可用而丢。登录之后由 cloudProgress 负责把它和云端合并，两边取并集。
 *
 * 这里同时是一个极小的订阅源：云端合并进来之后要通知界面重画，
 * 所以进度不再是「渲染时读一次」而是「订阅变化」。
 */

const KEY = "gomoku-dojo:progress:v1";

export interface LastPosition {
  openingId: string;
  lessonId: string;
  step: number;
  at: number;
}

export interface Progress {
  last?: LastPosition;
  /** 已完成的章节，格式 "openingId/lessonId" */
  done: string[];
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { done: [] };
    const parsed = JSON.parse(raw) as Progress;
    return {
      last: parsed.last,
      done: Array.isArray(parsed.done) ? parsed.done : [],
    };
  } catch {
    return { done: [] };
  }
}

function persist(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // 隐私模式下 localStorage 可能不可写，静默失败不影响学习
  }
}

let current: Progress = read();
const listeners = new Set<() => void>();

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProgress(): Progress {
  return current;
}

function commit(next: Progress) {
  current = next;
  persist(next);
  listeners.forEach((l) => l());
}

/** 兼容旧调用点：读当前内存快照（不再是每次读盘） */
export function loadProgress(): Progress {
  return current;
}

export function saveLast(openingId: string, lessonId: string, step: number) {
  commit({
    ...current,
    last: { openingId, lessonId, step, at: Date.now() },
  });
}

export function markLessonDone(openingId: string, lessonId: string) {
  const key = `${openingId}/${lessonId}`;
  if (current.done.includes(key)) return;
  commit({ ...current, done: [...current.done, key] });
}

/** 云端合并结果落盘（不触发上传，上传由调用方决定） */
export function replaceProgress(next: Progress) {
  commit(next);
}

/**
 * 清空本机进度。
 * 用在「这台设备换了另一个账号登录」的场景：上一个账号的进度不该被合并进新账号的云端数据。
 * 清掉的只是本机副本，那个账号的数据仍在云端。
 */
export function resetProgress() {
  commit({ done: [] });
}

export function isLessonDone(progress: Progress, openingId: string, lessonId: string) {
  return progress.done.includes(`${openingId}/${lessonId}`);
}

export function openingProgress(progress: Progress, openingId: string, total: number) {
  const count = progress.done.filter((k) => k.startsWith(`${openingId}/`)).length;
  return { done: count, total };
}

/** 两份进度取并集：完成章节取并集，最近位置取时间更晚的那份。 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const done = Array.from(new Set([...a.done, ...b.done]));
  const last =
    a.last && b.last ? (a.last.at >= b.last.at ? a.last : b.last) : (a.last ?? b.last);
  return last ? { last, done } : { done };
}
