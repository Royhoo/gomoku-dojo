/**
 * AI Worker 入口。
 *
 * 界面层只能通过 engine.ts 的 requestAIMove 接触 AI，
 * 搜索算法与评估函数全部藏在 Worker 内部——这是物理隔离，
 * 不是靠自觉约定。UI 层连一行 AI 代码都 import 不到。
 */

import type { BoardState, Role } from "../types";
import { chooseMove, type Difficulty } from "./search";

export interface AIRequest {
  id: number;
  board: BoardState;
  role: Role;
  difficulty: Difficulty;
}

export interface AIResponse {
  id: number;
  move: { x: number; y: number } | null;
  elapsedMs: number;
}

// Worker 全局作用域的类型在这里做最小化声明，避免为它单独引一套 lib
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<AIRequest>) => void) | null;
  postMessage: (msg: AIResponse) => void;
};

ctx.onmessage = (e: MessageEvent<AIRequest>) => {
  const { id, board, role, difficulty } = e.data;
  const started = Date.now();
  let move: { x: number; y: number } | null = null;
  try {
    move = chooseMove(board, role, difficulty);
  } catch (err) {
    console.error("[ai] 搜索失败", err);
  }
  ctx.postMessage({ id, move, elapsedMs: Date.now() - started });
};
