/**
 * 规则引擎：纯函数，零 React 依赖，可在 Worker / Node / 浏览器中运行。
 *
 * 这里只做四件事：
 *  1. 棋盘读写与胜负判定
 *  2. 棋型识别（连五 / 活四 / 冲四 / 活三 / 眠三 / 活二 / 眠二）
 *  3. 一步致胜点、候选点生成
 *  4. 为教学提供「这一手形成了什么」的可读描述
 *
 * 棋型识别刻意做成「按威胁层次递归计数」而不是硬编码模式表，
 * 因为这样能同时处理连子和跳子（如 xx.xx、x.xxx），不必为每种跳法写一条正则。
 */

import {
  BOARD_SIZE,
  DIRECTIONS,
  ROLE_VALUE,
  type BoardState,
  type Cell,
  type Point,
  type Role,
} from "./types";

/** 棋盘外 */
const EDGE = -1;

export function createBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0 as Cell),
  );
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.slice() as Cell[]);
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function isEmptyCell(board: BoardState, x: number, y: number): boolean {
  return inBounds(x, y) && board[y][x] === 0;
}

export function placeStone(board: BoardState, role: Role, p: Point): BoardState {
  const next = cloneBoard(board);
  if (!inBounds(p.x, p.y)) throw new Error(`坐标越界：${p.x},${p.y}`);
  next[p.y][p.x] = ROLE_VALUE[role];
  return next;
}

/** 统计从 (x,y) 沿某方向连续同色子的坐标（含起点） */
function lineThrough(
  board: BoardState,
  x: number,
  y: number,
  dx: number,
  dy: number,
  value: Cell,
): Point[] {
  const cells: Point[] = [{ x, y }];
  for (const sign of [1, -1]) {
    let cx = x + dx * sign;
    let cy = y + dy * sign;
    while (inBounds(cx, cy) && board[cy][cx] === value) {
      cells.push({ x: cx, y: cy });
      cx += dx * sign;
      cy += dy * sign;
    }
  }
  return cells;
}

/**
 * 判断落子后是否成五，成五则返回构成五连的全部坐标（用于高亮）。
 * 返回 null 表示未成五。
 */
export function checkWin(board: BoardState, x: number, y: number): Point[] | null {
  const value = board[y]?.[x];
  if (!value) return null;
  for (const [dx, dy] of DIRECTIONS) {
    const line = lineThrough(board, x, y, dx, dy, value as Cell);
    if (line.length >= 5) return line;
  }
  return null;
}

/** 全局是否已有五连（对局结束后判断用） */
export function findFive(board: BoardState, role: Role): Point[] | null {
  const value = ROLE_VALUE[role];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== value) continue;
      for (const [dx, dy] of DIRECTIONS) {
        const prevX = x - dx;
        const prevY = y - dy;
        // 只从线段起点开始数，避免重复
        if (inBounds(prevX, prevY) && board[prevY][prevX] === value) continue;
        let count = 0;
        let cx = x;
        let cy = y;
        while (inBounds(cx, cy) && board[cy][cx] === value) {
          count++;
          cx += dx;
          cy += dy;
        }
        if (count >= 5) {
          const cells: Point[] = [];
          for (let i = 0; i < count; i++) {
            cells.push({ x: x + dx * i, y: y + dy * i });
          }
          return cells;
        }
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 棋型识别
 * ------------------------------------------------------------------ */

/** 棋型等级，数值越大威胁越高 */
export const SHAPE_LEVEL = {
  NONE: 0,
  SLEEP_TWO: 1,
  OPEN_TWO: 2,
  SLEEP_THREE: 3,
  OPEN_THREE: 4,
  FOUR: 5,
  OPEN_FOUR: 6,
  FIVE: 7,
} as const;

export type ShapeLevel = (typeof SHAPE_LEVEL)[keyof typeof SHAPE_LEVEL];

export const SHAPE_NAME: Record<ShapeLevel, string> = {
  0: "无",
  1: "眠二",
  2: "活二",
  3: "眠三",
  4: "活三",
  5: "冲四",
  6: "活四",
  7: "连五",
};

/** 每个方向的可读称呼，用于界面文案 */
const DIR_NAME = ["横向", "竖向", "捺向（左上—右下）", "撇向（左下—右上）"] as const;

const WINDOW_RADIUS = 6;

/** 取出以 p 为中心、沿某方向的窗口：值 0/1/2 为格子，-1 为界外 */
function makeWindow(
  board: BoardState,
  p: Point,
  dx: number,
  dy: number,
  mine: Cell,
): number[] {
  const win: number[] = [];
  for (let i = -WINDOW_RADIUS; i <= WINDOW_RADIUS; i++) {
    const x = p.x + dx * i;
    const y = p.y + dy * i;
    if (!inBounds(x, y)) {
      win.push(EDGE);
      continue;
    }
    const v = board[y][x];
    win.push(v === 0 ? 0 : v === mine ? 1 : 2);
  }
  return win;
}

const CENTER_IDX = WINDOW_RADIUS;

/** 窗口中是否存在「经过中心点」的连续 5 子 */
function hasFiveThroughCenter(win: number[]): boolean {
  let left = 0;
  let right = 0;
  for (let i = CENTER_IDX - 1; i >= 0 && win[i] === 1; i--) left++;
  for (let i = CENTER_IDX + 1; i < win.length && win[i] === 1; i++) right++;
  return left + right + 1 >= 5;
}

const shapeCache = new Map<string, ShapeLevel>();

/**
 * 判定「经过窗口中心的这条线」当前是什么棋型。
 *
 * 判定顺序按威胁从高到低，用「再落几手能到什么」逐层回推：
 *   连五 → 落一手能成五的点数决定活四/冲四
 *        → 落一手能否成活四（活三）→ 能否成冲四（眠三）
 *        → 落一手能否成活三（活二）→ 能否成眠三（眠二）
 * depth 用来截断递归：判断「活二」最多需要往后推三手。
 */
function classifyWindow(win: number[], depth = 0): ShapeLevel {
  const key = `${depth}|${win.join(",")}`;
  const cached = shapeCache.get(key);
  if (cached !== undefined) return cached;

  let result: ShapeLevel = SHAPE_LEVEL.NONE;

  if (hasFiveThroughCenter(win)) {
    result = SHAPE_LEVEL.FIVE;
  } else {
    // 一手成五的点数：2 个以上可两头成五=活四，恰好 1 个=冲四
    let fiveWays = 0;
    for (let i = 0; i < win.length; i++) {
      if (win[i] !== 0) continue;
      win[i] = 1;
      if (hasFiveThroughCenter(win)) fiveWays++;
      win[i] = 0;
    }

    if (fiveWays >= 2) {
      result = SHAPE_LEVEL.OPEN_FOUR;
    } else if (fiveWays === 1) {
      result = SHAPE_LEVEL.FOUR;
    } else if (depth < 3) {
      result = classifyByDepth(win, depth);
    }
  }

  shapeCache.set(key, result);
  return result;
}

/** depth 未到上限时的低阶棋型判定 */
function classifyByDepth(win: number[], depth: number): ShapeLevel {
  const ways = countFillsFallingInto(win, depth);
  if (ways[SHAPE_LEVEL.OPEN_FOUR] >= 1) return SHAPE_LEVEL.OPEN_THREE;
  if (ways[SHAPE_LEVEL.FOUR] >= 1) return SHAPE_LEVEL.SLEEP_THREE;
  if (ways[SHAPE_LEVEL.OPEN_THREE] >= 1) return SHAPE_LEVEL.OPEN_TWO;
  if (ways[SHAPE_LEVEL.SLEEP_THREE] >= 1) return SHAPE_LEVEL.SLEEP_TWO;
  return SHAPE_LEVEL.NONE;
}

/** 统计窗口内每个空点落子后分别落入哪一档棋型 */
function countFillsFallingInto(
  win: number[],
  depth: number,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let i = 0; i < win.length; i++) {
    if (win[i] !== 0) continue;
    win[i] = 1;
    const lv = classifyWindow(win, depth + 1);
    win[i] = 0;
    counts[lv] = (counts[lv] ?? 0) + 1;
  }
  return counts;
}

export interface ShapeInfo {
  /** 方向序号，对应 DIRECTIONS */
  dir: number;
  /** 方向称呼 */
  dirName: string;
  level: ShapeLevel;
  /** 棋型中文名 */
  label: string;
}

/**
 * 计算在 (x,y) 落子后，该点在四个方向上各自形成的棋型。
 * 前提：board 中该点已经是 role 的子（调用方先落子）。
 */
export function analyzePoint(board: BoardState, p: Point, role: Role): ShapeInfo[] {
  const mine = ROLE_VALUE[role];
  const result: ShapeInfo[] = [];
  DIRECTIONS.forEach(([dx, dy], idx) => {
    const win = makeWindow(board, p, dx, dy, mine);
    const level = classifyWindow(win);
    result.push({
      dir: idx,
      dirName: DIR_NAME[idx],
      level,
      label: SHAPE_NAME[level],
    });
  });
  return result;
}

/** 综合威胁等级：取四方向最高 */
export function bestShape(board: BoardState, p: Point, role: Role): ShapeInfo | null {
  const all = analyzePoint(board, p, role);
  let best = all[0] ?? null;
  for (const s of all) if (s.level > (best?.level ?? 0)) best = s;
  return best && best.level > 0 ? best : null;
}

/* ------------------------------------------------------------------ *
 * 候选点与一步致胜
 * ------------------------------------------------------------------ */

/** 已有棋子邻域内的空点（切比雪夫距离 radius 内），空盘返回天元 */
export function candidateMoves(board: BoardState, radius = 2): Point[] {
  const out: Point[] = [];
  const seen = new Set<number>();
  let hasStone = false;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 0) continue;
      hasStone = true;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (!isEmptyCell(board, nx, ny)) continue;
          const key = ny * BOARD_SIZE + nx;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ x: nx, y: ny });
        }
      }
    }
  }

  if (!hasStone) return [{ x: 7, y: 7 }];
  return out;
}

/** 找出 role 立刻成五的所有点 */
export function findImmediateWins(board: BoardState, role: Role): Point[] {
  const wins: Point[] = [];
  for (const p of candidateMoves(board, 1)) {
    const next = placeStone(board, role, p);
    if (checkWin(next, p.x, p.y)) wins.push(p);
  }
  return wins;
}

/** 判断某点是否会让对手立刻成五（用于教学里的「不能下这里」） */
export function givesOpponentWin(
  board: BoardState,
  role: Role,
  p: Point,
): boolean {
  const opponent: Role = role === "black" ? "white" : "black";
  const next = placeStone(board, role, p);
  return findImmediateWins(next, opponent).length > 0;
}
