/**
 * 棋盘渲染组件——一个「哑组件」。
 *
 * 它只做三件事：把 BoardState 画出来、把点击转成坐标、抛出 onMove。
 * 它不持有对局状态、不判胜负、不叫 AI。
 * 逻辑一旦跑进组件里，就再也拆不出来了，所以这里刻意保持极薄。
 *
 * 用 SVG 而不是 Canvas 或 DOM 网格的原因：
 * viewBox 天然等比缩放，从 320px 手机到 4K 显示器一路无损，不需要手写缩放逻辑。
 */

import { useId } from "react";
import type { BoardState, Point, Role } from "../game/types";
import { BOARD_SIZE } from "../game/types";
import { BOARD_THEMES, type BoardThemeId } from "./theme";
import { useBoardInput } from "./useBoardInput";

const SIZE = 600;
const PAD = 36;
const CELL = (SIZE - PAD * 2) / (BOARD_SIZE - 1);
const STONE_R = CELL * 0.44;

/** 星位：天元 + 四角星，与标准棋盘一致 */
const STAR_POINTS: Point[] = [
  { x: 3, y: 3 },
  { x: 11, y: 3 },
  { x: 3, y: 11 },
  { x: 11, y: 11 },
  { x: 7, y: 7 },
];

const COL_LABELS = "ABCDEFGHIJKLMNO".split("");

export type MarkerTone = "pine" | "cinnabar" | "ink";

export interface BoardMarker {
  x: number;
  y: number;
  tone: MarkerTone;
}

export interface BoardProps {
  board: BoardState;
  themeId?: BoardThemeId;
  lastMove?: Point | null;
  /** 棋型高亮 */
  markers?: BoardMarker[];
  /** 提示落点（呼吸光环） */
  hint?: Point | null;
  /** 演示用的错点（红圈） */
  wrongMove?: Point | null;
  /** 演示用的半透明棋子（配合 wrongMove 显示「如果下在这里」） */
  ghost?: { point: Point; role: Role } | null;
  onMove?: (p: Point) => void;
  disabled?: boolean;
  showCoords?: boolean;
  className?: string;
}

const cx = (x: number) => PAD + x * CELL;
const cy = (y: number) => PAD + y * CELL;

const TONE_COLOR: Record<MarkerTone, string> = {
  pine: "#2E5E4E",
  cinnabar: "#B23A2E",
  ink: "#1C1917",
};

export function Board({
  board,
  themeId = "wood",
  lastMove = null,
  markers = [],
  hint = null,
  wrongMove = null,
  ghost = null,
  onMove,
  disabled = false,
  showCoords = false,
  className = "",
}: BoardProps) {
  const theme = BOARD_THEMES[themeId];
  const uid = useId().replace(/:/g, "");
  const { svgRef, preview, pressed, handlers } = useBoardInput({
    size: SIZE,
    pad: PAD,
    board,
    disabled,
    onCommit: (p) => onMove?.(p),
  });

  const interactive = !!onMove && !disabled;
  const previewEmpty = preview && board[preview.y]?.[preview.x] === 0;

  return (
    <div
      className={`relative w-full select-none ${className}`}
      style={{ touchAction: interactive ? "none" : "auto" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block h-auto w-full rounded-[18px]"
        style={{
          boxShadow: "0 6px 24px rgba(28,25,23,0.14), 0 1px 2px rgba(28,25,23,0.10)",
          cursor: interactive ? "pointer" : "default",
        }}
        role="img"
        aria-label="五子棋棋盘"
        {...(interactive ? handlers : {})}
      >
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.bgFrom} />
            <stop offset="100%" stopColor={theme.bgTo} />
          </linearGradient>
          <radialGradient id={`black-${uid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={theme.blackFrom} />
            <stop offset="100%" stopColor={theme.blackTo} />
          </radialGradient>
          <radialGradient id={`white-${uid}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={theme.whiteFrom} />
            <stop offset="100%" stopColor={theme.whiteTo} />
          </radialGradient>
        </defs>

        {/* 底板 */}
        <rect x="0" y="0" width={SIZE} height={SIZE} rx="18" fill={`url(#bg-${uid})`} />

        {/* 网格 */}
        <g stroke={theme.grid} strokeWidth="1" opacity="0.75">
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={PAD}
              y1={cy(i)}
              x2={SIZE - PAD}
              y2={cy(i)}
            />
          ))}
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={cx(i)}
              y1={PAD}
              x2={cx(i)}
              y2={SIZE - PAD}
            />
          ))}
        </g>

        {/* 星位 */}
        <g fill={theme.star}>
          {STAR_POINTS.map((p) => (
            <circle key={`s-${p.x}-${p.y}`} cx={cx(p.x)} cy={cy(p.y)} r={3.4} />
          ))}
        </g>

        {/* 坐标（可选，桌面端用） */}
        {showCoords && (
          <g fill={theme.label} fontSize="11" fontFamily="system-ui" opacity="0.7">
            {COL_LABELS.map((c, i) => (
              <text key={`cl-${c}`} x={cx(i)} y={SIZE - PAD + 20} textAnchor="middle">
                {c}
              </text>
            ))}
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <text
                key={`rl-${i}`}
                x={PAD - 20}
                y={cy(i) + 4}
                textAnchor="middle"
              >
                {BOARD_SIZE - i}
              </text>
            ))}
          </g>
        )}

        {/* 棋型高亮：先铺一层柔光在棋子下层 */}
        <g>
          {markers.map((m) => (
            <circle
              key={`mh-${m.x}-${m.y}-${m.tone}`}
              cx={cx(m.x)}
              cy={cy(m.y)}
              r={CELL * 0.62}
              fill={theme.highlightSoft}
              className="animate-rise"
            />
          ))}
        </g>

        {/* 提示落点 */}
        {hint && (
          <g>
            <circle
              cx={cx(hint.x)}
              cy={cy(hint.y)}
              r={CELL * 0.46}
              fill="none"
              stroke="#2E5E4E"
              strokeWidth="3"
              className="animate-hint"
              style={{ transformOrigin: `${cx(hint.x)}px ${cy(hint.y)}px` }}
            />
          </g>
        )}

        {/* 棋子 */}
        <g>
          {board.map((row, y) =>
            row.map((cell, x) => {
              if (cell === 0) return null;
              const role: Role = cell === 1 ? "black" : "white";
              const isLast = lastMove && lastMove.x === x && lastMove.y === y;
              return (
                <g key={`st-${x}-${y}`} className={isLast ? "animate-drop" : undefined}>
                  <circle
                    cx={cx(x) + 1}
                    cy={cy(y) + 2}
                    r={STONE_R}
                    fill="rgba(20,16,12,0.22)"
                  />
                  <circle
                    cx={cx(x)}
                    cy={cy(y)}
                    r={STONE_R}
                    fill={`url(#${role}-${uid})`}
                    stroke={role === "black" ? theme.blackEdge : theme.whiteEdge}
                    strokeWidth="0.9"
                  />
                  <ellipse
                    cx={cx(x) - STONE_R * 0.3}
                    cy={cy(y) - STONE_R * 0.34}
                    rx={STONE_R * 0.3}
                    ry={STONE_R * 0.2}
                    fill="#FFFFFF"
                    opacity={role === "black" ? 0.2 : 0.75}
                  />
                  {/* 最后一手：朱砂小点，比红圈雅致，也是围棋的传统做法 */}
                  {isLast && (
                    <circle
                      cx={cx(x)}
                      cy={cy(y)}
                      r={STONE_R * 0.2}
                      fill="#B23A2E"
                      className="animate-dot"
                    />
                  )}
                </g>
              );
            }),
          )}
        </g>

        {/* 棋型高亮：棋子之上的细环，保证看得见 */}
        <g pointerEvents="none">
          {markers.map((m) => (
            <circle
              key={`mr-${m.x}-${m.y}-${m.tone}`}
              cx={cx(m.x)}
              cy={cy(m.y)}
              r={STONE_R + 4.5}
              fill="none"
              stroke={TONE_COLOR[m.tone]}
              strokeWidth="2.5"
              className="animate-rise"
            />
          ))}
        </g>

        {/* 演示错点：半透明子 + 红色圈套 */}
        {ghost && (
          <g className="animate-shake" style={{ transformOrigin: `${cx(ghost.point.x)}px ${cy(ghost.point.y)}px` }}>
            <circle
              cx={cx(ghost.point.x)}
              cy={cy(ghost.point.y)}
              r={STONE_R}
              fill={ghost.role === "black" ? "#1C1917" : "#FFFFFF"}
              opacity="0.42"
            />
            <circle
              cx={cx(ghost.point.x)}
              cy={cy(ghost.point.y)}
              r={CELL * 0.5}
              fill="none"
              stroke="#B23A2E"
              strokeWidth="3"
            />
          </g>
        )}

        {wrongMove && !ghost && (
          <circle
            cx={cx(wrongMove.x)}
            cy={cy(wrongMove.y)}
            r={CELL * 0.5}
            fill="none"
            stroke="#B23A2E"
            strokeWidth="3"
          />
        )}

        {/* 触控十字参考线 + 预览子 */}
        {interactive && pressed && preview && (
          <g pointerEvents="none">
            <line
              x1={PAD}
              y1={cy(preview.y)}
              x2={SIZE - PAD}
              y2={cy(preview.y)}
              stroke="#1C1917"
              strokeWidth="1"
              opacity="0.22"
              strokeDasharray="4 5"
            />
            <line
              x1={cx(preview.x)}
              y1={PAD}
              x2={cx(preview.x)}
              y2={SIZE - PAD}
              stroke="#1C1917"
              strokeWidth="1"
              opacity="0.22"
              strokeDasharray="4 5"
            />
          </g>
        )}

        {interactive && previewEmpty && preview && (
          <circle
            cx={cx(preview.x)}
            cy={cy(preview.y)}
            r={STONE_R}
            fill="#1C1917"
            opacity={pressed ? 0.34 : 0.14}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
