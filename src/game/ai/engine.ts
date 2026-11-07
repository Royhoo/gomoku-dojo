/**
 * AI 调用入口——界面层唯一能接触 AI 的地方。
 *
 * 设计要点：
 *   1. 搜索跑在 Web Worker 里，主线程不卡
 *   2. Worker 不可用时（部分 WebView / file:// 环境）自动降级到主线程，
 *      宁可卡一下也不能一步都走不出来
 *   3. 对外只暴露 requestAIMove 一个函数，入参出参都是最朴素的棋盘数组
 */

import type { BoardState, Point, Role } from "../types";
import { chooseMove, type Difficulty } from "./search";
import type { AIRequest, AIResponse } from "./worker";

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, (res: AIResponse) => void>();

function ensureWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<AIResponse>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb(e.data);
      }
    };
    worker.onerror = () => {
      // Worker 挂了就标记为不可用，后续全部走主线程
      workerBroken = true;
      worker = null;
      pending.clear();
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

/** 主线程兜底计算 */
function computeLocally(
  board: BoardState,
  role: Role,
  difficulty: Difficulty,
): Point | null {
  return chooseMove(board, role, difficulty);
}

/**
 * 请求 AI 落子。
 * @param board 当前局面
 * @param role  AI 执子方
 * @param difficulty 难度
 */
export function requestAIMove(
  board: BoardState,
  role: Role,
  difficulty: Difficulty,
): Promise<Point | null> {
  const w = ensureWorker();
  if (!w) {
    return Promise.resolve(computeLocally(board, role, difficulty));
  }

  const id = ++seq;
  const payload: AIRequest = { id, board, role, difficulty };

  return new Promise<Point | null>((resolve) => {
    // 超时保护：Worker 没响应就降级，避免界面永远转圈
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      resolve(computeLocally(board, role, difficulty));
    }, 6000);

    pending.set(id, (res) => {
      clearTimeout(timer);
      resolve(res.move ? { x: res.move.x, y: res.move.y } : null);
    });

    w.postMessage(payload);
  });
}

/** 供解耦验证用：当前 AI 是否运行在 Worker 里 */
export function aiRuntime(): "worker" | "main-thread" {
  return workerBroken ? "main-thread" : "worker";
}
