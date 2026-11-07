/**
 * 课程内容的数据结构。
 *
 * 设计原则：内容与组件彻底分离。
 * 以后想改一句讲解、加一个错点、调一处高亮，只改 openings/ 下的数据文件，
 * 不需要碰任何 React 组件。
 */

import type { Role } from "../game/types";

/** 一个非最佳下法（「看着也行，其实不该这么走」） */
export interface Alternative {
  /** 坐标，如 "J7" */
  coord: string;
  /**
   * 这一手的性质：
   *  - "wrong" 结构性错误（挡不住、送对手成五、方向反了）
   *  - "slow"  不算错棋，但不是此刻该下的一手（只是慢半拍）
   * 刻意区分这两类：把「只是慢」讲成「错」，是在骗学员。
   */
  kind: "wrong" | "slow";
  /** 学员视角的直觉描述，例如「这里好像更主动」 */
  label: string;
  /** 为什么不行——必须能被棋盘验证的结构性理由 */
  whyNot: string;
  /** 对手的应对演示（1–2 手），点开后在棋盘上自动演示 */
  punish?: { coord: string; role: Role; note: string }[];
  /** 演示结束后的一句话结论 */
  verdict?: string;
}

/** 一手棋及其讲解 */
export interface AnnotatedMove {
  coord: string;
  role: Role;
  /** 一句话结论：「为什么下这里」 */
  title: string;
  /** 展开说明 */
  why: string;
  /** 需要高亮的坐标（棋型标记） */
  highlight?: string[];
  /** 值得展开讲的错点 */
  alternatives?: Alternative[];
  /** 若存在，说明这一手要让学员自己下 */
  ask?: { prompt: string; hint?: boolean };
  /** 数据来源标记，用于区分「定式」与「引擎推荐」 */
  source?: "joseki" | "engine";
}

/** 一章 */
export interface Lesson {
  id: string;
  title: string;
  /** 一句话说明这一章要学会什么 */
  goal: string;
  /** 起始局面；空数组表示空盘 */
  setup: { coord: string; role: Role }[];
  moves: AnnotatedMove[];
  /** 章末提示（比如「下一章会用到」） */
  outro?: string;
  /** 本章结束后引导去和 AI 实战 */
  sparring?: boolean;
}

/** 一个开局 */
export interface Opening {
  id: string;
  name: string;
  alias: string[];
  /** 教学执方；必胜开局只对黑棋成立 */
  side: Role;
  category: "直指" | "斜指";
  /** 难度 1–5 */
  level: number;
  intro: string;
  /** 定式前三手，用于首页缩略图与内容校验 */
  openingMoves: string[];
  lessons: Lesson[];
}
