/**
 * 坐标系统。
 *
 * 五子棋定式资料统一使用「列 A–O、行 1–15」的记法，天元是 H8。
 * 为了能直接把资料里的坐标抄进课程数据、避免人工换算出错，
 * 这里提供 parseCoord / formatCoord 两个函数。
 *
 * 换算关系（与主流连珠资料一致）：
 *   列：A=0 … O=14，从左往右
 *   行：1=最下 … 15=最上，所以数组行号 = 15 - 行号
 *   例：H8 → { x: 7, y: 7 }（正好是 15×15 棋盘的正中心）
 */

import type { Point } from "./types";
import { BOARD_SIZE } from "./types";

const COL_LETTERS = "ABCDEFGHIJKLMNO";

/** 把 "H8" 解析为内部坐标；非法输入抛错，避免静默写错数据 */
export function parseCoord(coord: string): Point {
  const m = /^([A-O])(\d{1,2})$/i.exec(coord.trim());
  if (!m) throw new Error(`无法解析坐标：${coord}（应为 A1–O15）`);
  const x = COL_LETTERS.indexOf(m[1].toUpperCase());
  const row = Number(m[2]);
  if (row < 1 || row > BOARD_SIZE) throw new Error(`行号越界：${coord}`);
  return { x, y: BOARD_SIZE - row };
}

/** 把内部坐标还原成 "H8" 记法，用于界面标注 */
export function formatCoord(p: Point): string {
  const col = COL_LETTERS[p.x] ?? "?";
  return `${col}${BOARD_SIZE - p.y}`;
}

/** 天元 */
export const CENTER: Point = { x: 7, y: 7 };
