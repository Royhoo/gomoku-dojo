/**
 * 棋盘的输入层。
 *
 * 为什么单独一个 hook：手机上指尖接触面积约 40–50px，
 * 而 15 路棋盘在手机上每格只有 25px 左右——直接点必然盖住邻格。
 * 所以这里做三件事：
 *   1. 用 pointer 事件而不是 click，响应更即时
 *   2. 吸附到最近的交叉点，不要求点在棋子上
 *   3. 按下先显示十字参考线 + 半透明预览子，抬起才真正落子（先看见、再确认）
 *
 * 这一层同时兼容鼠标：桌面端享受同样的预览体验，不写两套分支。
 */

import { useCallback, useRef, useState } from "react";
import type { BoardState, Point } from "../game/types";
import { BOARD_SIZE } from "../game/types";

export interface UseBoardInputOptions {
  /** SVG 的 viewBox 边长 */
  size: number;
  /** 棋盘内边距（像素，viewBox 坐标系） */
  pad: number;
  board: BoardState;
  disabled?: boolean;
  onCommit: (p: Point) => void;
}

export interface UseBoardInputResult {
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** 当前预览点（鼠标悬停或手指按下） */
  preview: Point | null;
  /** 手指是否按下（用于显示十字线） */
  pressed: boolean;
  handlers: {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void;
  };
}

export function useBoardInput({
  size,
  pad,
  board,
  disabled,
  onCommit,
}: UseBoardInputOptions): UseBoardInputResult {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [preview, setPreview] = useState<Point | null>(null);
  const [pressed, setPressed] = useState(false);
  const downPoint = useRef<Point | null>(null);

  const cell = (size - pad * 2) / (BOARD_SIZE - 1);

  /** 把屏幕坐标换算成最近的交叉点 */
  const toGrid = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): Point | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const px = ((e.clientX - rect.left) / rect.width) * size;
      const py = ((e.clientY - rect.top) / rect.height) * size;

      const gx = Math.round((px - pad) / cell);
      const gy = Math.round((py - pad) / cell);
      if (gx < 0 || gx >= BOARD_SIZE || gy < 0 || gy >= BOARD_SIZE) return null;
      return { x: gx, y: gy };
    },
    [cell, pad, size],
  );

  const canPlace = useCallback(
    (p: Point) => board[p.y]?.[p.x] === 0,
    [board],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      const p = toGrid(e);
      if (!p) return;
      downPoint.current = p;
      setPressed(true);
      setPreview(p);
      // 捕获指针，手指滑出棋盘也能收到 up 事件
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [disabled, toGrid],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      const p = toGrid(e);
      setPreview(p);
    },
    [disabled, toGrid],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      const p = toGrid(e);
      const start = downPoint.current;
      setPressed(false);
      downPoint.current = null;

      // 抬起点与按下点一致才落子，避免手指滑动误落
      if (!p || !start || p.x !== start.x || p.y !== start.y) return;
      if (!canPlace(p)) return;

      onCommit(p);
      setPreview(null);
    },
    [canPlace, disabled, onCommit, toGrid],
  );

  const onPointerLeave = useCallback(() => {
    setPressed(false);
    downPoint.current = null;
    setPreview(null);
  }, []);

  const onPointerCancel = useCallback(() => {
    setPressed(false);
    downPoint.current = null;
    setPreview(null);
  }, []);

  return {
    svgRef,
    preview,
    pressed,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
  };
}
