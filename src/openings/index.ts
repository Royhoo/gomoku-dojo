/**
 * 课程数据注册表。
 *
 * 用 import.meta.glob 自动扫描 openings/ 下的每个目录，
 * 只要目录里有 opening.ts 并按约定导出 Opening 对象，就会出现在首页。
 * 也就是说：加一个新开局 = 新建一个目录，不改这里任何一行。
 */

import type { Opening } from "../lesson/types";

const modules = import.meta.glob<Record<string, unknown>>("./*/opening.ts", {
  eager: true,
});

function pickOpening(mod: Record<string, unknown>): Opening | null {
  for (const value of Object.values(mod)) {
    if (value && typeof value === "object" && "id" in value && "lessons" in value) {
      return value as Opening;
    }
  }
  return null;
}

export const OPENINGS: Opening[] = Object.values(modules)
  .map(pickOpening)
  .filter((o): o is Opening => o !== null)
  .sort((a, b) => a.level - b.level);

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}

export function getLesson(openingId: string, lessonId: string) {
  const opening = getOpening(openingId);
  if (!opening) return null;
  const lesson = opening.lessons.find((l) => l.id === lessonId);
  if (!lesson) return null;
  return { opening, lesson };
}
