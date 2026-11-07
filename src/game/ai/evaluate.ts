/**
 * 局面评估：窗口计数法。
 *
 * 思路很朴素：把棋盘上所有可能成五的「五格窗口」扫一遍，
 * 窗口里只有一方棋子时，按棋子数量给分（1 子 1 分、2 子 10 分…）。
 * 活三之所以比眠三值钱，是因为活三会落在更多有效窗口里——
 * 不需要为活三/眠三单独写模式表，这是它比硬编码模式更不容易出错的原因。
 */

import {
  BOARD_SIZE,
  DIRECTIONS,
  ROLE_VALUE,
  type BoardState,
  type Role,
} from "../types";

/** 窗口内棋子数对应的分值 */
const WINDOW_SCORE = [0, 1, 12, 120, 1400, 100_000];

/**
 * 计算 role 视角下的局面分。
 * 正数表示 role 占优，数值量级参考：一个活四约等于 1400×若干窗口。
 */
export function evaluateBoard(board: BoardState, role: Role): number {
  const mine = ROLE_VALUE[role];
  const theirs = mine === 1 ? 2 : 1;
  let score = 0;

  for (const [dx, dy] of DIRECTIONS) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        // 只处理「五格窗口」的起点，避免重复统计
        const endX = x + dx * 4;
        const endY = y + dy * 4;
        if (endX < 0 || endX >= BOARD_SIZE || endY < 0 || endY >= BOARD_SIZE) continue;
        // 每个方向只从一个端点起步，跳过反向重复
        const backX = x - dx;
        const backY = y - dy;
        if (
          backX >= 0 &&
          backX < BOARD_SIZE &&
          backY >= 0 &&
          backY < BOARD_SIZE
        ) {
          continue;
        }

        let mineCount = 0;
        let theirsCount = 0;
        for (let i = 0; i < 5; i++) {
          const v = board[y + dy * i][x + dx * i];
          if (v === mine) mineCount++;
          else if (v === theirs) theirsCount++;
        }

        if (mineCount > 0 && theirsCount > 0) continue;
        if (mineCount > 0) score += WINDOW_SCORE[mineCount];
        else if (theirsCount > 0) score -= WINDOW_SCORE[theirsCount] * 1.1;
      }
    }
  }

  return score;
}

/**
 * 单点价值：假设 role 在此落子后，局面对 role 的增益。
 * 用于候选点排序（排序质量直接决定 Alpha-Beta 的剪枝效率）。
 */
export function moveHeuristic(board: BoardState, x: number, y: number, role: Role): number {
  const next = board.map((row) => row.slice());
  next[y][x] = ROLE_VALUE[role];
  return evaluateBoard(next, role);
}
