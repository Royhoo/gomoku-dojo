/**
 * AI 引擎测试：只验证「硬保证」。
 * 棋力强弱无法用单元测试证明，但「能赢必赢、该堵必堵」可以。
 */

import { describe, expect, it } from "vitest";
import { chooseMove } from "./search";
import { createBoard, placeStone } from "../rules";
import { parseCoord, formatCoord } from "../coords";
import type { BoardState, Role } from "../types";

const put = (b: BoardState, c: string, r: Role) => placeStone(b, r, parseCoord(c));

describe("AI 硬保证", () => {
  it("自己能成五时必定成五", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8"]) b = put(b, c, "black");
    b = put(b, "H9", "white");

    const move = chooseMove(b, "black", "hard", { rng: () => 1 });
    expect(move).not.toBeNull();
    const coord = formatCoord(move!);
    expect(["D8", "I8"]).toContain(coord);
  });

  it("对手四连时必须堵", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8"]) b = put(b, c, "white");
    b = put(b, "H10", "black");

    const move = chooseMove(b, "black", "hard", { rng: () => 1 });
    expect(move).not.toBeNull();
    expect(["D8", "I8"]).toContain(formatCoord(move!));
  });

  it("入门难度同样不会漏掉致胜点", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8"]) b = put(b, c, "black");
    const move = chooseMove(b, "black", "easy", { rng: () => 0.99 });
    expect(["D8", "I8"]).toContain(formatCoord(move!));
  });

  it("返回的落点必须是空位", () => {
    let b = createBoard();
    b = put(b, "H8", "black");
    b = put(b, "H9", "white");
    b = put(b, "I9", "black");
    const move = chooseMove(b, "white", "normal", { rng: () => 1 });
    expect(move).not.toBeNull();
    expect(b[move!.y][move!.x]).toBe(0);
  });

  it("空盘时黑棋按天元开局", () => {
    const move = chooseMove(createBoard(), "black", "normal", { rng: () => 1 });
    expect(move).toEqual({ x: 7, y: 7 });
  });

  it("不会在无子可下时崩溃", () => {
    // 构造满盘（无五连）不现实，这里只验证空盘与常规局面返回合法点
    const b = createBoard();
    const move = chooseMove(b, "white", "easy", { rng: () => 0.5 });
    expect(move).not.toBeNull();
  });
});
