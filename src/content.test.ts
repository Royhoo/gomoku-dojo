/**
 * 课程内容完整性校验。
 *
 * 这些检查防的是「内容错」而不是「代码错」——
 * 教学项目里，一个重复的坐标比一个编译错误严重得多。
 */

import { describe, expect, it } from "vitest";
import { OPENINGS } from "./openings";
import { parseCoord } from "./game/coords";
import { createBoard, placeStone, analyzePoint, SHAPE_LEVEL } from "./game/rules";
import { BOARD_SIZE } from "./game/types";

describe("课程数据", () => {
  it("至少注册了两个开局", () => {
    expect(OPENINGS.length).toBeGreaterThanOrEqual(2);
    const ids = OPENINGS.map((o) => o.id);
    expect(ids).toContain("huayue");
    expect(ids).toContain("puyue");
  });

  for (const opening of OPENINGS) {
    describe(`开局：${opening.name}`, () => {
      it("定式前三手能正常落子且不重复", () => {
        expect(opening.openingMoves).toHaveLength(3);
        let board = createBoard();
        const seen = new Set<string>();
        const roles = ["black", "white", "black"] as const;
        opening.openingMoves.forEach((c, i) => {
          const p = parseCoord(c);
          const key = `${p.x},${p.y}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
          board = placeStone(board, roles[i], p);
        });
        // 黑 1 必须是天元
        expect(parseCoord(opening.openingMoves[0])).toEqual({ x: 7, y: 7 });
      });

      it("每一章的落子序列都合法（不压子、不越界）", () => {
        for (const lesson of opening.lessons) {
          let board = createBoard();
          const used = new Set<string>();

          for (const s of lesson.setup) {
            const p = parseCoord(s.coord);
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThan(BOARD_SIZE);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThan(BOARD_SIZE);
            const key = `${p.x},${p.y}`;
            expect(used.has(key), `第「${lesson.title}」章起始局面坐标重复：${s.coord}`).toBe(false);
            used.add(key);
            board = placeStone(board, s.role, p);
          }

          for (const m of lesson.moves) {
            const p = parseCoord(m.coord);
            const key = `${p.x},${p.y}`;
            expect(
              used.has(key),
              `第「${lesson.title}」章：坐标 ${m.coord} 被重复使用`,
            ).toBe(false);
            used.add(key);
            board = placeStone(board, m.role, p);
          }
        }
      });

      it("每一处错点都用不同的坐标", () => {
        for (const lesson of opening.lessons) {
          const seen = new Set<string>();
          for (const m of lesson.moves) {
            for (const alt of m.alternatives ?? []) {
              expect(
                seen.has(alt.coord),
                `第「${lesson.title}」章：错点 ${alt.coord} 重复出现`,
              ).toBe(false);
              seen.add(alt.coord);
            }
          }
        }
      });

      it("每一手都写了「为什么」", () => {
        for (const lesson of opening.lessons) {
          for (const m of lesson.moves) {
            expect(m.title.length).toBeGreaterThan(2);
            expect(m.why.length).toBeGreaterThan(10);
          }
        }
      });
    });
  }
});

describe("关键棋型断言（教学文案以此为准）", () => {
  it("花月：白4 走 I8 后，黑5 G7 形成活三", () => {
    let b = createBoard();
    b = placeStone(b, "black", parseCoord("H8"));
    b = placeStone(b, "white", parseCoord("H9"));
    b = placeStone(b, "black", parseCoord("I9"));
    b = placeStone(b, "white", parseCoord("I8"));
    const g7 = parseCoord("G7");
    b = placeStone(b, "black", g7);
    const shapes = analyzePoint(b, g7, "black");
    expect(Math.max(...shapes.map((s) => s.level))).toBe(SHAPE_LEVEL.OPEN_THREE);
  });

  it("浦月：白4 走 G9 后，黑5 J8 形成双活二", () => {
    let b = createBoard();
    b = placeStone(b, "black", parseCoord("H8"));
    b = placeStone(b, "white", parseCoord("I9"));
    b = placeStone(b, "black", parseCoord("I7"));
    b = placeStone(b, "white", parseCoord("G9"));
    const j8 = parseCoord("J8");
    b = placeStone(b, "black", j8);
    const opens = analyzePoint(b, j8, "black").filter(
      (s) => s.level >= SHAPE_LEVEL.OPEN_TWO,
    );
    expect(opens.length).toBeGreaterThanOrEqual(2);
  });

  it("浦月：白4 走 J6 后，黑5 G9 只是眠三（说明白4 确实堵住了捺线）", () => {
    let b = createBoard();
    b = placeStone(b, "black", parseCoord("H8"));
    b = placeStone(b, "white", parseCoord("I9"));
    b = placeStone(b, "black", parseCoord("I7"));
    b = placeStone(b, "white", parseCoord("J6"));
    const g9 = parseCoord("G9");
    b = placeStone(b, "black", g9);
    const shapes = analyzePoint(b, g9, "black");
    expect(Math.max(...shapes.map((s) => s.level))).toBe(SHAPE_LEVEL.SLEEP_THREE);
  });
});
