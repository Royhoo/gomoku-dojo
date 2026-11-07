/**
 * 棋盘外观主题。
 *
 * 这一层是刻意单独拆出来的：想换棋盘的质感、配色、明暗，
 * 只改这个文件即可，不需要碰 Board.tsx，更碰不到 AI 和规则。
 *
 * 同时它也是「界面与逻辑解耦」的验收工具：
 * 页面上切换主题后立刻去下一局人机对战，如果 AI 照常思考、照常落子，
 * 说明分层是真的；如果出了问题，说明解耦是假的。
 */

export type BoardThemeId = "wood" | "slate";

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  /** 棋盘底色渐变 */
  bgFrom: string;
  bgTo: string;
  /** 网格线与星位 */
  grid: string;
  star: string;
  /** 坐标文字 */
  label: string;
  /** 黑子 */
  blackFrom: string;
  blackTo: string;
  blackEdge: string;
  /** 白子 */
  whiteFrom: string;
  whiteTo: string;
  whiteEdge: string;
  /** 高亮色 */
  highlight: string;
  highlightSoft: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  wood: {
    id: "wood",
    name: "原木",
    bgFrom: "#E6D2AF",
    bgTo: "#D2B78B",
    grid: "#8A6E4B",
    star: "#6B5334",
    label: "#7A6142",
    blackFrom: "#4A4A4A",
    blackTo: "#0B0B0B",
    blackEdge: "#000000",
    whiteFrom: "#FFFFFF",
    whiteTo: "#DDD6C8",
    whiteEdge: "#B8AE9C",
    highlight: "#2E5E4E",
    highlightSoft: "rgba(46, 94, 78, 0.16)",
  },
  slate: {
    id: "slate",
    name: "青石",
    bgFrom: "#3E4247",
    bgTo: "#2A2D31",
    grid: "#7C848C",
    star: "#9AA3AC",
    label: "#98A1A9",
    blackFrom: "#5A5F66",
    blackTo: "#121417",
    blackEdge: "#05070A",
    whiteFrom: "#FDFDFB",
    whiteTo: "#D8DCE0",
    whiteEdge: "#A9B0B8",
    highlight: "#D8B25A",
    highlightSoft: "rgba(216, 178, 90, 0.18)",
  },
};
