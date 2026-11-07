/**
 * 规则引擎测试。
 *
 * 这些测试的作用不只是「跑通」，还用来验证棋型识别的判定标准是否可靠——
 * 教学里说「这一手形成活三」时，背后就是这里的结论。
 */

import { describe, expect, it } from "vitest";
import {
  analyzePoint,
  bestShape,
  candidateMoves,
  checkWin,
  createBoard,
  findImmediateWins,
  placeStone,
  SHAPE_LEVEL,
} from "./rules";
import { parseCoord, formatCoord } from "./coords";
import type { BoardState, Point, Role } from "./types";

/** 便捷：按 "H8" 记法批量落子 */
function put(board: BoardState, coord: string, role: Role): BoardState {
  return placeStone(board, role, parseCoord(coord));
}

describe("坐标换算", () => {
  it("天元 H8 映射到棋盘正中心", () => {
    expect(parseCoord("H8")).toEqual({ x: 7, y: 7 });
  });

  it("四个角正确", () => {
    expect(parseCoord("A1")).toEqual({ x: 0, y: 14 });
    expect(parseCoord("A15")).toEqual({ x: 0, y: 0 });
    expect(parseCoord("O1")).toEqual({ x: 14, y: 14 });
    expect(parseCoord("O15")).toEqual({ x: 14, y: 0 });
  });

  it("解析与还原可往返", () => {
    for (const c of ["H8", "A1", "O15", "I9", "I7", "G7"]) {
      expect(formatCoord(parseCoord(c))).toBe(c);
    }
  });

  it("非法坐标抛错而不是静默返回", () => {
    expect(() => parseCoord("P8")).toThrow();
    expect(() => parseCoord("H16")).toThrow();
    expect(() => parseCoord("")).toThrow();
  });
});

describe("胜负判定", () => {
  it("横向连成五子判胜", () => {
    let b = createBoard();
    for (const c of ["D8", "E8", "F8", "G8", "H8"]) b = put(b, c, "black");
    const win = checkWin(b, parseCoord("H8").x, parseCoord("H8").y);
    expect(win).not.toBeNull();
    expect(win).toHaveLength(5);
  });

  it("四子相连不算胜", () => {
    let b = createBoard();
    for (const c of ["D8", "E8", "F8", "G8"]) b = put(b, c, "black");
    const p = parseCoord("G8");
    expect(checkWin(b, p.x, p.y)).toBeNull();
  });

  it("斜向连五也判胜", () => {
    let b = createBoard();
    for (const c of ["E5", "F6", "G7", "H8", "I9"]) b = put(b, c, "black");
    const p = parseCoord("I9");
    expect(checkWin(b, p.x, p.y)).not.toBeNull();
  });
});

describe("棋型识别", () => {
  it("两端封死的四子不是活四", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8"]) b = put(b, c, "black");
    const p = parseCoord("H8");
    const shapes = analyzePoint(b, p, "black");
    const horizontal = shapes.find((s) => s.dir === 0)!;
    // 两端都在盘内且为空，此处应是活四
    expect(horizontal.level).toBe(SHAPE_LEVEL.OPEN_FOUR);
  });

  it("一端被白子封住是冲四而不是活四", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8"]) b = put(b, c, "black");
    b = put(b, "D8", "white");
    const p = parseCoord("H8");
    const horizontal = analyzePoint(b, p, "black").find((s) => s.dir === 0)!;
    expect(horizontal.level).toBe(SHAPE_LEVEL.FOUR);
  });

  it("三子两端开是活三", () => {
    let b = createBoard();
    for (const c of ["F8", "G8", "H8"]) b = put(b, c, "black");
    const horizontal = analyzePoint(b, parseCoord("H8"), "black").find((s) => s.dir === 0)!;
    expect(horizontal.level).toBe(SHAPE_LEVEL.OPEN_THREE);
  });

  it("三子一端被封是眠三", () => {
    let b = createBoard();
    for (const c of ["F8", "G8", "H8"]) b = put(b, c, "black");
    b = put(b, "E8", "white");
    const horizontal = analyzePoint(b, parseCoord("H8"), "black").find((s) => s.dir === 0)!;
    expect(horizontal.level).toBe(SHAPE_LEVEL.SLEEP_THREE);
  });

  it("跳四 xx.xx 识别为冲四", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "H8", "I8"]) b = put(b, c, "black");
    const p = parseCoord("I8");
    const horizontal = analyzePoint(b, p, "black").find((s) => s.dir === 0)!;
    expect(horizontal.level).toBe(SHAPE_LEVEL.FOUR);
  });

  it("两子相隔一排仍算活二", () => {
    let b = createBoard();
    for (const c of ["G8", "I8"]) b = put(b, c, "black");
    const p = parseCoord("I8");
    const horizontal = analyzePoint(b, p, "black").find((s) => s.dir === 0)!;
    expect(horizontal.level).toBe(SHAPE_LEVEL.OPEN_TWO);
  });

  it("连五优先于其它判断", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8", "I8"]) b = put(b, c, "black");
    const p = parseCoord("H8");
    expect(bestShape(b, p, "black")?.level).toBe(SHAPE_LEVEL.FIVE);
  });
});

describe("候选点与致胜点", () => {
  it("空盘只返回天元", () => {
    expect(candidateMoves(createBoard())).toEqual([{ x: 7, y: 7 }]);
  });

  it("候选点都在已有棋子周围", () => {
    let b = createBoard();
    b = put(b, "H8", "black");
    const cands = candidateMoves(b, 2);
    expect(cands.length).toBeGreaterThan(0);
    expect(cands.length).toBeLessThan(BOARD_LIMIT);
    for (const p of cands) {
      expect(Math.abs(p.x - 7)).toBeLessThanOrEqual(2);
      expect(Math.abs(p.y - 7)).toBeLessThanOrEqual(2);
    }
  });

  it("能找到立刻成五的点", () => {
    let b = createBoard();
    for (const c of ["E8", "F8", "G8", "H8"]) b = put(b, c, "black");
    const wins = findImmediateWins(b, "black").map(formatCoord);
    expect(wins).toContain("D8");
    expect(wins).toContain("I8");
  });
});

const BOARD_LIMIT = 15 * 15;

describe("花月局前三手（定式核对）", () => {
  it("黑1 天元、白2 H9、黑3 I9 后，黑1与黑3构成撇向活二", () => {
    let b = createBoard();
    b = put(b, "H8", "black");
    b = put(b, "H9", "white");
    b = put(b, "I9", "black");

    // 黑3 的坐标为 I9 → {x:8, y:6}
    const black3 = parseCoord("I9");
    expect(black3).toEqual({ x: 8, y: 6 });

    const shapes = analyzePoint(b, black3, "black");
    const slash = shapes.find((s) => s.dir === 3); // 撇向：左下—右上
    expect(slash?.level).toBe(SHAPE_LEVEL.OPEN_TWO);
  });

  it("黑1与黑3在撇向相邻，白2 不在该线上", () => {
    const b1: Point = parseCoord("H8");
    const b3: Point = parseCoord("I9");
    const w2: Point = parseCoord("H9");
    expect(b3.x - b1.x).toBe(1);
    expect(b3.y - b1.y).toBe(-1);
    // 白2 与黑1 是竖向相邻，不落在黑1-黑3 的撇线上
    expect(w2.x - b1.x).toBe(0);
    expect(w2.y - b1.y).toBe(-1);
  });
});

describe("浦月局前三手（定式核对）", () => {
  it("黑1 天元、白2 I9、黑3 I7 后，黑1与黑3构成捺向活二", () => {
    let b = createBoard();
    b = put(b, "H8", "black");
    b = put(b, "I9", "white");
    b = put(b, "I7", "black");

    // 黑3 的坐标为 I7 → {x:8, y:8}，与黑1(7,7) 沿捺向相邻
    const black3 = parseCoord("I7");
    expect(black3).toEqual({ x: 8, y: 8 });

    const shapes = analyzePoint(b, black3, "black");
    const diagonal = shapes.find((s) => s.dir === 2); // 捺向：左上—右下
    expect(diagonal?.level).toBe(SHAPE_LEVEL.OPEN_TWO);
  });

  it("白2 与黑3 同列，黑3 在白2 下方两行", () => {
    const w2 = parseCoord("I9");
    const b3 = parseCoord("I7");
    expect(b3.x).toBe(w2.x);
    expect(b3.y - w2.y).toBe(2);
  });
});
