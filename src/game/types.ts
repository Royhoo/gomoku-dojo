/**
 * 全局共享的数据契约。
 *
 * 这一层刻意保持极小：棋盘只认「15×15 的格子数组」和「坐标」，
 * 它永远不会知道界面长什么样、AI 用什么算法。
 * 界面层与逻辑层之间只交换这里定义的三个类型。
 */

/** 执子方 */
export type Role = "black" | "white";

/** 棋盘边长（路数） */
export const BOARD_SIZE = 15;

/** 一格的状态：0 空、1 黑、2 白 */
export type Cell = 0 | 1 | 2;

/** 棋盘状态，索引方式为 board[y][x]，y=0 是最上面一行 */
export type BoardState = Cell[][];

/** 一手棋 */
export interface Move {
  x: number;
  y: number;
  role: Role;
}

/** 坐标点（不含执子方） */
export interface Point {
  x: number;
  y: number;
}

/** 四方向：横、竖、撇（右上-左下）、捺（左上-右下） */
export const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

export const ROLE_VALUE: Record<Role, Cell> = { black: 1, white: 2 };

export function otherRole(role: Role): Role {
  return role === "black" ? "white" : "black";
}

export function roleOfCell(cell: Cell): Role | null {
  if (cell === 1) return "black";
  if (cell === 2) return "white";
  return null;
}
