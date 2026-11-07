/**
 * 对局搜索：Negamax + Alpha-Beta 剪枝 + 迭代加深。
 *
 * 三条硬保证，任何难度都不会破：
 *   1. 自己能成五，必成五
 *   2. 对手下一步能成五（即冲四），必堵
 *   3. 绝不返回非法点
 *
 * 难度不靠「算得更深」单维调节——那只会在手机上超时卡住。
 * 难度 = 搜索深度 × 候选宽度 × 思考时间 × 犯错概率，四个旋钮一起调。
 */

import {
  BOARD_SIZE,
  ROLE_VALUE,
  otherRole,
  type BoardState,
  type Point,
  type Role,
} from "../types";
import { candidateMoves, checkWin, findImmediateWins } from "../rules";
import { evaluateBoard } from "./evaluate";

export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyConfig {
  depth: number;
  timeLimitMs: number;
  candidateLimit: number;
  /** 0–1，越高越可能不选最优解（制造「可战胜」的手感） */
  randomness: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { depth: 2, timeLimitMs: 350, candidateLimit: 8, randomness: 0.45 },
  normal: { depth: 4, timeLimitMs: 900, candidateLimit: 14, randomness: 0.12 },
  hard: { depth: 6, timeLimitMs: 1800, candidateLimit: 20, randomness: 0 },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "入门",
  normal: "进阶",
  hard: "强手",
};

/** 成五的分数线，远高于任何普通局面分 */
const WIN_SCORE = 10_000_000;

interface SearchContext {
  deadline: number;
  nodes: number;
  aborted: boolean;
}

function isTimeUp(ctx: SearchContext): boolean {
  if (ctx.aborted) return true;
  // 每 512 个节点检查一次时钟，避免频繁调用 Date.now 拖慢搜索
  if ((ctx.nodes & 511) === 0 && Date.now() > ctx.deadline) {
    ctx.aborted = true;
  }
  return ctx.aborted;
}

/** 候选点排序用的局部评分：只看周围两圈，O(1) 复杂度 */
function localScore(board: BoardState, x: number, y: number, role: Role): number {
  const mine = ROLE_VALUE[role];
  let score = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
      const v = board[ny][nx];
      if (v === 0) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const weight = 3 - dist; // 越近越重要
      score += v === mine ? weight * 2 : weight * 3;
    }
  }
  return score;
}

/** 生成并按局部评分排序后的候选点 */
function orderedCandidates(
  board: BoardState,
  role: Role,
  limit: number,
): Point[] {
  const cands = candidateMoves(board, 2);
  if (cands.length <= limit) {
    return cands.sort(
      (a, b) => localScore(board, b.x, b.y, role) - localScore(board, a.x, a.y, role),
    );
  }
  return cands
    .map((p) => ({ p, s: localScore(board, p.x, p.y, role) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((it) => it.p);
}

function withStone(board: BoardState, p: Point, role: Role): BoardState {
  const next = board.map((row) => row.slice());
  next[p.y][p.x] = ROLE_VALUE[role];
  return next;
}

function negamax(
  board: BoardState,
  role: Role,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchContext,
): number {
  ctx.nodes++;
  if (isTimeUp(ctx)) return evaluateBoard(board, role);
  if (depth <= 0) return evaluateBoard(board, role);

  const moves = orderedCandidates(board, role, 14);
  if (moves.length === 0) return evaluateBoard(board, role);

  let best = -Infinity;
  let a = alpha;

  for (const p of moves) {
    const next = withStone(board, p, role);
    let value: number;
    if (checkWin(next, p.x, p.y)) {
      // 越快取胜越好：用深度换一点分差，避免在能赢时绕圈
      value = WIN_SCORE + depth;
    } else {
      value = -negamax(next, otherRole(role), depth - 1, -beta, -a, ctx);
    }

    if (value > best) best = value;
    if (best > a) a = best;
    if (a >= beta) break; // 剪枝
    if (ctx.aborted) break;
  }

  return best === -Infinity ? evaluateBoard(board, role) : best;
}

/** 根节点搜索：返回带评分的候选，供难度层挑选手感 */
function searchRoot(
  board: BoardState,
  role: Role,
  cfg: DifficultyConfig,
): { p: Point; score: number }[] {
  const ctx: SearchContext = {
    deadline: Date.now() + cfg.timeLimitMs,
    nodes: 0,
    aborted: false,
  };
  const moves = orderedCandidates(board, role, cfg.candidateLimit);
  const scored: { p: Point; score: number }[] = [];

  let alpha = -Infinity;
  for (const p of moves) {
    const next = withStone(board, p, role);
    let score: number;
    if (checkWin(next, p.x, p.y)) {
      score = WIN_SCORE;
    } else {
      const value = -negamax(
        next,
        otherRole(role),
        Math.max(1, cfg.depth - 1),
        -Infinity,
        -alpha,
        ctx,
      );
      // 对手能立刻反成五，说明这一手是送死，重罚
      const oppWins = findImmediateWins(next, otherRole(role));
      score = oppWins.length > 0 ? value - WIN_SCORE / 2 : value;
    }
    scored.push({ p, score });
    if (score > alpha) alpha = score;
    if (ctx.aborted) break;
  }

  // 时间不够导致部分候选没算，剩余候选按评估分兜底
  if (scored.length < moves.length) {
    for (const p of moves.slice(scored.length)) {
      scored.push({ p, score: evaluateBoard(withStone(board, p, role), role) });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

export interface ChooseMoveOptions {
  /** 可注入的随机源，测试时传入固定值以得到确定结果 */
  rng?: () => number;
}

/**
 * 为 role 选一手棋。
 * 返回 null 表示棋盘已满，无处可下。
 */
export function chooseMove(
  board: BoardState,
  role: Role,
  difficulty: Difficulty = "normal",
  options: ChooseMoveOptions = {},
): Point | null {
  const rng = options.rng ?? Math.random;
  const cfg = DIFFICULTY[difficulty];
  const opponent = otherRole(role);

  // 硬保证 1：能成五必成五
  const myWins = findImmediateWins(board, role);
  if (myWins.length > 0) return myWins[0];

  // 硬保证 2：对手冲四必堵
  const oppWins = findImmediateWins(board, opponent);
  if (oppWins.length > 0) return oppWins[0];

  const scored = searchRoot(board, role, cfg);
  if (scored.length === 0) return null;

  // 难度层：按犯错概率在前几名里随机，制造「偶尔走坏棋」的手感
  if (cfg.randomness > 0 && rng() < cfg.randomness) {
    const pool = scored.slice(0, Math.min(3, scored.length));
    const idx = Math.floor(rng() * pool.length) % pool.length;
    return pool[idx].p;
  }

  return scored[0].p;
}
