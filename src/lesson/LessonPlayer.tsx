/**
 * 教学播放器。
 *
 * 推进的粒度是「一手棋」而不是「一页」：点一次「下一手」，棋盘落一子、
 * 解说换成这一手的话。学员随时能倒回去重看，倒回去时解说也跟着回退。
 *
 * 三种梯度：
 *   演示   —— 只看，点下一手
 *   带着下 —— 该他落子时，正确位置有提示，点对了才能继续
 *   放手下 —— 无提示，自己判断（本章最后一手）
 */

import { useEffect, useMemo, useState } from "react";
import { Board } from "../board/Board";
import type { BoardThemeId } from "../board/theme";
import { parseCoord } from "../game/coords";
import { createBoard, placeStone } from "../game/rules";
import type { BoardState, Point } from "../game/types";
import type { Alternative, AnnotatedMove, Lesson, Opening } from "./types";
import { Button, Card, ProgressBar, Tag } from "../components/ui";

interface LessonPlayerProps {
  opening: Opening;
  lesson: Lesson;
  step: number;
  themeId: BoardThemeId;
  onStepChange: (step: number) => void;
  onLessonComplete: () => void;
  onGoSparring: () => void;
  onPrevLesson?: () => void;
  onNextLesson?: () => void;
}

function buildBoard(lesson: Lesson, step: number): BoardState {
  let board = createBoard();
  for (const s of lesson.setup) {
    board = placeStone(board, s.role, parseCoord(s.coord));
  }
  const upto = Math.min(step, lesson.moves.length - 1);
  for (let i = 0; i <= upto; i++) {
    const m = lesson.moves[i];
    if (!m) continue;
    board = placeStone(board, m.role, parseCoord(m.coord));
  }
  return board;
}

export function LessonPlayer({
  opening,
  lesson,
  step,
  themeId,
  onStepChange,
  onLessonComplete,
  onGoSparring,
  onPrevLesson,
  onNextLesson,
}: LessonPlayerProps) {
  const moves = lesson.moves;
  const total = moves.length;
  const current: AnnotatedMove | undefined = moves[step];

  // 错点演示状态
  const [openAlt, setOpenAlt] = useState<string | null>(null);
  const [punishStep, setPunishStep] = useState(0);
  // 学员落子反馈
  const [askFeedback, setAskFeedback] = useState<string | null>(null);
  const [wrongPoint, setWrongPoint] = useState<Point | null>(null);
  const [hintOn, setHintOn] = useState(false);

  // 切章或换手时清空临时状态
  useEffect(() => {
    setOpenAlt(null);
    setPunishStep(0);
    setAskFeedback(null);
    setWrongPoint(null);
    setHintOn(false);
  }, [step, lesson.id]);

  const pendingAsk: AnnotatedMove | null = useMemo(() => {
    const next = moves[step + 1];
    return next?.ask ? next : null;
  }, [moves, step]);

  const baseBoard = useMemo(() => buildBoard(lesson, step), [lesson, step]);

  const alt: Alternative | null = useMemo(() => {
    if (!openAlt) return null;
    return current?.alternatives?.find((a) => a.coord === openAlt) ?? null;
  }, [openAlt, current]);

  // 错点演示：自动播放对手的应对
  useEffect(() => {
    if (!alt?.punish?.length) return;
    setPunishStep(0);
    const timer = setInterval(() => {
      setPunishStep((s) => {
        if (s >= alt.punish!.length) {
          clearInterval(timer);
          return s;
        }
        return s + 1;
      });
    }, 850);
    return () => clearInterval(timer);
  }, [alt]);

  const punishMoves = alt?.punish?.slice(0, punishStep) ?? [];

  // 演示棋盘 = 基础局面 + 错子（半透明）+ 对手应对
  const demoBoard = useMemo(() => {
    if (!alt) return baseBoard;
    let b = placeStone(baseBoard, current!.role, parseCoord(alt.coord));
    for (const p of punishMoves) b = placeStone(b, p.role, parseCoord(p.coord));
    return b;
  }, [alt, baseBoard, current, punishMoves]);

  const markers = useMemo(() => {
    const list = (current?.highlight ?? []).map((c) => {
      const p = parseCoord(c);
      return { x: p.x, y: p.y, tone: "pine" as const };
    });
    return list;
  }, [current]);

  const lastMove: Point | null = useMemo(() => {
    if (step < 0) return null;
    return parseCoord(moves[step].coord);
  }, [moves, step]);

  const handleBoardMove = (p: Point) => {
    if (!pendingAsk) return;
    const target = parseCoord(pendingAsk.coord);
    if (p.x === target.x && p.y === target.y) {
      setAskFeedback(null);
      setWrongPoint(null);
      onStepChange(step + 1);
    } else {
      setWrongPoint(p);
      setAskFeedback("不是这里。先看上面的提示，再想想这一手要同时做成什么。");
    }
  };

  const atEnd = step >= total - 1;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* 左：棋盘 */}
      <div className="min-w-0 lg:sticky lg:top-20">
        <Board
          className="mx-auto max-w-[600px]"
          board={alt ? demoBoard : baseBoard}
          themeId={themeId}
          lastMove={alt ? null : lastMove}
          markers={alt ? [] : markers}
          ghost={alt ? { point: parseCoord(alt.coord), role: current!.role } : null}
          wrongMove={wrongPoint}
          hint={
            pendingAsk && hintOn && !askFeedback ? parseCoord(pendingAsk.coord) : null
          }
          onMove={pendingAsk ? handleBoardMove : undefined}
          disabled={!pendingAsk}
        />

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={Math.max(0, step + 1)} max={total} />
          </div>
          <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-ink-faint)]">
            {Math.max(0, step + 1)} / {total}
          </span>
        </div>
      </div>

      {/* 右：讲解 */}
      <div className="min-w-0 space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag tone="pine">{opening.name}</Tag>
            <Tag>{lesson.title}</Tag>
          </div>
          <h2 className="text-[19px] leading-snug sm:text-[21px]">{lesson.title}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
            {lesson.goal}
          </p>
        </Card>

        {current ? (
          <div key={`${lesson.id}-${step}`} className="animate-rise">
            <Card className="p-4 sm:p-5">
              <div className="mb-1.5 flex items-center gap-2 text-[12px] text-[var(--color-ink-faint)]">
                <span>第 {step + 1} 手</span>
                <span>·</span>
                <span>{current.role === "black" ? "黑" : "白"}</span>
              </div>
              <h3 className="text-[16.5px] leading-snug text-[var(--color-ink)]">
                {current.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.85] text-[var(--color-ink-soft)]">
                {current.why}
              </p>

              {current.alternatives?.length ? (
                <div className="mt-4 border-t border-dashed border-[var(--color-line)] pt-3">
                  <p className="mb-2 text-[12.5px] text-[var(--color-ink-faint)]">
                    换个下法会怎样？点开看棋盘上的后果：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {current.alternatives.map((a) => (
                      <button
                        key={a.coord}
                        onClick={() => setOpenAlt(openAlt === a.coord ? null : a.coord)}
                        className={`rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
                          openAlt === a.coord
                            ? "border-[var(--color-cinnabar)] bg-[var(--color-cinnabar-soft)] text-[var(--color-cinnabar)]"
                            : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-faint)]"
                        }`}
                      >
                        {a.coord} · {a.label}
                      </button>
                    ))}
                  </div>

                  {alt && (
                    <div className="mt-3 rounded-[12px] bg-[var(--color-paper-deep)] p-3.5">
                      <div className="mb-1 flex items-center gap-2">
                        <Tag tone={alt.kind === "wrong" ? "cinnabar" : "ink"}>
                          {alt.kind === "wrong" ? "这一手是错的" : "这一手不算错，但慢半拍"}
                        </Tag>
                        <span className="text-[12px] text-[var(--color-ink-faint)]">
                          {alt.coord}
                        </span>
                      </div>
                      <p className="text-[13.5px] leading-[1.8] text-[var(--color-ink-soft)]">
                        {alt.whyNot}
                      </p>
                      {alt.verdict && (
                        <p className="mt-2 text-[13px] leading-[1.8] text-[var(--color-ink)]">
                          {alt.verdict}
                        </p>
                      )}
                      <Button
                        variant="quiet"
                        size="sm"
                        className="mt-1 -ml-1"
                        onClick={() => setOpenAlt(null)}
                      >
                        收起，回到正解
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </Card>
          </div>
        ) : (
          <Card className="p-4 sm:p-5">
            <p className="text-[14px] leading-[1.85] text-[var(--color-ink-soft)]">
              这一章从
              {lesson.setup.length > 0
                ? `一个已经摆好 ${lesson.setup.length} 子的局面开始`
                : "空棋盘开始"}
              。点「下一手」，我们一手一手走。
            </p>
          </Card>
        )}

        {pendingAsk && (
          <Card className="border-[var(--color-pine)]/40 bg-[var(--color-pine-soft)]/60 p-4">
            <p className="text-[14px] font-medium text-[var(--color-pine)]">
              该你下了
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
              {pendingAsk.ask?.prompt}
            </p>
            {askFeedback && (
              <p className="mt-2 text-[13px] text-[var(--color-cinnabar)]">{askFeedback}</p>
            )}
            <div className="mt-2.5 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setHintOn(true)}>
                给我一点提示
              </Button>
            </div>
          </Card>
        )}

        {lesson.sparring && (
          <Card className="p-4 sm:p-5">
            <p className="text-[14px] leading-[1.85] text-[var(--color-ink-soft)]">
              {lesson.outro}
            </p>
            <Button className="mt-3" onClick={onGoSparring}>
              去和机器下一局
            </Button>
          </Card>
        )}

        {/* 操作条：手机上吸底，并避开全面屏手势区 */}
        <div
          className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-[var(--color-line)] bg-[var(--color-paper)]/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onStepChange(Math.max(-1, step - 1))}
              disabled={step < 0}
            >
              上一手
            </Button>

            {!atEnd ? (
              <Button
                className="flex-1"
                onClick={() => onStepChange(step + 1)}
                disabled={!!pendingAsk}
              >
                {pendingAsk ? "先在棋盘上落子" : "下一手"}
              </Button>
            ) : (
              <Button className="flex-1" onClick={onLessonComplete}>
                这一章看完了
              </Button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-[12.5px] text-[var(--color-ink-faint)]">
            <button
              className="hover:text-[var(--color-ink)] disabled:opacity-40"
              onClick={onPrevLesson}
              disabled={!onPrevLesson}
            >
              ← 上一章
            </button>
            <button
              className="hover:text-[var(--color-ink)] disabled:opacity-40"
              onClick={onNextLesson}
              disabled={!onNextLesson}
            >
              下一章 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
