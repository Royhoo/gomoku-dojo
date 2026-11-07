/**
 * 人机对战。
 *
 * 三条设计取舍：
 *  1. 人类执黑先行（和教学一致），AI 执白
 *  2. 悔棋必须是「一次退两步」——只退一步会变成 AI 连走
 *  3. 棋盘主题开关放在这里，是「界面与逻辑解耦」的现场验证：
 *     换主题后 AI 照常思考照常落子，说明分层是真的
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../../board/Board";
import { BOARD_THEMES, type BoardThemeId } from "../../board/theme";
import { Button, Card, Tag } from "../../components/ui";
import { requestAIMove } from "../../game/ai/engine";
import { DIFFICULTY_LABEL, type Difficulty } from "../../game/ai/search";
import { checkWin, createBoard, placeStone } from "../../game/rules";
import type { BoardState, Move, Point, Role } from "../../game/types";

type Outcome =
  | { kind: "playing" }
  | { kind: "win"; role: Role }
  | { kind: "draw" };

const HUMAN: Role = "black";
const AI: Role = "white";

export function PlayPage() {
  const [board, setBoard] = useState<BoardState>(createBoard);
  const [history, setHistory] = useState<Move[]>([]);
  const [turn, setTurn] = useState<Role>(HUMAN);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "playing" });
  const [thinking, setThinking] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [themeId, setThemeId] = useState<BoardThemeId>("wood");
  const [hint, setHint] = useState<Point | null>(null);
  const requestId = useRef(0);

  const reset = useCallback(() => {
    requestId.current++;
    setBoard(createBoard());
    setHistory([]);
    setTurn(HUMAN);
    setOutcome({ kind: "playing" });
    setThinking(false);
    setHint(null);
  }, []);

  const commitMove = useCallback((move: Move) => {
    setBoard((prev) => {
      const next = placeStone(prev, move.role, move);
      const line = checkWin(next, move.x, move.y);
      if (line) {
        setOutcome({ kind: "win", role: move.role });
      } else {
        setOutcome((cur) => (cur.kind === "playing" ? cur : cur));
      }
      return next;
    });
    setHistory((prev) => [...prev, move]);
    setTurn(move.role === HUMAN ? AI : HUMAN);
    setHint(null);
  }, []);

  // 轮到 AI 时自动落子
  useEffect(() => {
    if (turn !== AI || outcome.kind !== "playing") return;
    const id = ++requestId.current;
    setThinking(true);
    let cancelled = false;
    (async () => {
      const move = await requestAIMove(board, AI, difficulty);
      if (cancelled || id !== requestId.current) return;
      setThinking(false);
      if (!move) {
        setOutcome({ kind: "draw" });
        return;
      }
      commitMove({ x: move.x, y: move.y, role: AI });
    })();
    return () => {
      cancelled = true;
    };
  }, [turn, board, difficulty, outcome.kind, commitMove]);

  const handleHumanMove = (p: Point) => {
    if (turn !== HUMAN || outcome.kind !== "playing") return;
    if (board[p.y][p.x] !== 0) return;
    commitMove({ x: p.x, y: p.y, role: HUMAN });
  };

  const undo = () => {
    if (history.length === 0) return;
    requestId.current++;
    // 退回到「上一次轮到人类之前」：通常退两手，人类刚下完还没等 AI 时退一手
    const steps = history.length >= 2 ? 2 : 1;
    const kept = history.slice(0, history.length - steps);
    let b = createBoard();
    for (const m of kept) b = placeStone(b, m.role, m);
    setHistory(kept);
    setBoard(b);
    setOutcome({ kind: "playing" });
    setThinking(false);
    setHint(null);
    setTurn(HUMAN);
  };

  const askHint = async () => {
    if (turn !== HUMAN || outcome.kind !== "playing" || thinking) return;
    const move = await requestAIMove(board, HUMAN, "hard");
    if (move) setHint(move);
  };

  const statusText = (() => {
    if (outcome.kind === "win") {
      return outcome.role === HUMAN ? "你赢了" : "机器赢了";
    }
    if (outcome.kind === "draw") return "棋盘下满了，和棋";
    if (thinking) return "机器在思考…";
    return "轮到你（执黑）";
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          className="text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          ← 道场
        </Link>
        <span className="text-[var(--color-line)]">/</span>
        <span className="text-[13px] text-[var(--color-ink)]">人机对战</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-20">
        <Board
          className="mx-auto max-w-[600px]"
          board={board}
          themeId={themeId}
          lastMove={history.length ? history[history.length - 1] : null}
          hint={hint}
          onMove={handleHumanMove}
          disabled={turn !== HUMAN || outcome.kind !== "playing"}
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                outcome.kind !== "playing"
                  ? "bg-[var(--color-cinnabar)]"
                  : thinking
                    ? "bg-[var(--color-ink-faint)]"
                    : "bg-[var(--color-pine)]"
              }`}
            />
            <span className="text-[13.5px] text-[var(--color-ink-soft)]">{statusText}</span>
          </div>
          <span className="text-[12px] tabular-nums text-[var(--color-ink-faint)]">
            第 {history.length} 手
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <Card className="p-4">
          <h2 className="text-[17px]">对局设置</h2>

          <p className="mt-3 mb-1.5 text-[12.5px] text-[var(--color-ink-faint)]">难度</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-[10px] border py-2 text-[13px] transition-colors ${
                  difficulty === d
                    ? "border-[var(--color-pine)] bg-[var(--color-pine-soft)] text-[var(--color-pine)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-soft)]"
                }`}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>

          <p className="mt-4 mb-1.5 text-[12.5px] text-[var(--color-ink-faint)]">
            棋盘外观（换皮肤不影响 AI）
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((t) => (
              <button
                key={t}
                onClick={() => setThemeId(t)}
                className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] transition-colors ${
                  themeId === t
                    ? "border-[var(--color-pine)] bg-[var(--color-pine-soft)] text-[var(--color-pine)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-soft)]"
                }`}
              >
                <span
                  className="inline-block h-4 w-4 rounded-[4px] border border-black/10"
                  style={{
                    background: `linear-gradient(135deg, ${BOARD_THEMES[t].bgFrom}, ${BOARD_THEMES[t].bgTo})`,
                  }}
                />
                {BOARD_THEMES[t].name}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" onClick={askHint} disabled={turn !== HUMAN}>
              给点提示
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={history.length === 0 || thinking}
            >
              悔棋
            </Button>
          </div>

          <Button className="mt-2 w-full" size="sm" onClick={reset}>
            重新开一局
          </Button>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Tag tone="pine">提示</Tag>
          </div>
          <p className="text-[13px] leading-[1.8] text-[var(--color-ink-soft)]">
            入门档会主动放过一些好棋，适合先赢一局建立信心；强手档几乎不犯错。
            但三档都不会漏掉「能成五」和「该堵的四」——会犯低级错误的对手，反而让人看不懂。
          </p>
        </Card>
        </div>
      </div>
    </div>
  );
}
