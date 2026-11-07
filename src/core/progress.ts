/**
 * 学习进度。
 *
 * 只用 localStorage 记两件事：上次看到哪、哪些章节走完了。
 * 不做账号、不做后端——进度丢了影响很小，换设备不同步是可接受的代价。
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

export function loadProgress(): Progress {
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

export function saveLast(openingId: string, lessonId: string, step: number) {
  const p = loadProgress();
  p.last = { openingId, lessonId, step, at: Date.now() };
  persist(p);
}

export function markLessonDone(openingId: string, lessonId: string) {
  const p = loadProgress();
  const key = `${openingId}/${lessonId}`;
  if (!p.done.includes(key)) {
    p.done.push(key);
    persist(p);
  }
}

export function isLessonDone(progress: Progress, openingId: string, lessonId: string) {
  return progress.done.includes(`${openingId}/${lessonId}`);
}

export function openingProgress(progress: Progress, openingId: string, total: number) {
  const count = progress.done.filter((k) => k.startsWith(`${openingId}/`)).length;
  return { done: count, total };
}
