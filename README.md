# 五子棋道场 · gomoku-dojo

把五子棋的必胜开局拆成一手一手，讲清楚**为什么下这里**、**为什么不那样下**。学完可以直接跟机器对弈。

- 花月局（直指）、浦月局（斜指）两个完整课程
- 每一手都有讲解，关键手可点开「换个下法」看棋盘上的后果
- 人机对战：三档难度，支持悔棋与一步提示
- 纯前端、离线可用，可打包成安卓 APK

## 在线访问

- 网页版：<https://gomoku-dojo-67873.app.workbuddy.host/?sharecode=4DL72Y4TC6>
- 安卓包：<https://github.com/Royhoo/gomoku-dojo/releases/tag/latest>（每次推代码自动更新）

## 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:5173
npm test         # 39 项测试，覆盖规则、棋型、AI 与课程数据
npm run build    # 产出 dist/（网页版）
npm run build:app # 产出 dist/（App 用：相对路径 + Hash 路由）
```

## 目录结构

```
src/
├── game/              # 逻辑层：零 React 依赖
│   ├── types.ts       # 全局数据契约：BoardState / Move / Role
│   ├── coords.ts      # "H9" ↔ {x,y} 坐标换算
│   ├── rules.ts       # 胜负判定 + 棋型识别（活三/冲四/活四…）
│   └── ai/            # AI：评估、搜索、Worker、调用入口
├── board/             # 渲染层：纯展示，不持有任何对局状态
│   ├── Board.tsx      # SVG 棋盘
│   ├── useBoardInput.ts # 触控吸附 + 落子预览
│   └── theme.ts       # 棋盘外观主题（换皮肤只改这里）
├── lesson/            # 教学层
│   ├── types.ts       # 课程数据结构
│   └── LessonPlayer.tsx
├── openings/          # 课程内容 ★ 最常改的地方
│   ├── index.ts       # 自动扫描，丢目录即生效
│   ├── huayue/opening.ts
│   └── puyue/opening.ts
├── app/               # 路由与页面
├── components/        # 通用 UI
└── core/progress.ts   # 学习进度（localStorage）
```

### 三层依赖方向

```
内容（openings/） → 教学组件（lesson/） → 逻辑（game/）
                                    ↖ 渲染（board/）
```

`game/` 里不允许出现任何 `react` 或界面代码，`board/` 里不允许出现 AI 实现。
这条约定靠代码审查维持，不是靠自觉——它保证「换一个更漂亮的棋盘」时，
AI 和规则一行都不用动。

## 改课程内容

讲解文字全部在 `src/openings/*/opening.ts` 里，改文案不需要碰任何组件。

每一手棋的结构：

```ts
{
  coord: "I9",              // 直接用定式资料里的记法，不用换算
  role: "black",
  title: "黑 3：下在白 2 的右侧",
  why: "这一手同时做了两件事……",
  highlight: ["H8", "I9"],  // 需要高亮的棋型
  alternatives: [{
    coord: "H7",
    kind: "wrong",          // "wrong" 结构性错误 / "slow" 只是慢半拍
    label: "垂直往下长，看着更连贯",
    whyNot: "竖线上方紧贴着白 2，做出来是眠二……",
    verdict: "同样是「成二」，价值差一个量级。",
  }],
}
```

`kind` 这个字段是刻意加的：把「只是慢」讲成「错」，是在骗学员。

### 加一个新开局（5 步）

1. 复制 `src/openings/huayue/` 为 `src/openings/xinyue/`
2. 改 `opening.ts` 里的 `id`、`name`、`openingMoves` 和课程内容
3. 重启 `npm run dev`
4. 跑 `npm test` —— 内容校验会检查坐标重复、压子、标题为空等问题
5. 首页会自动出现新卡片，不需要改任何组件代码

## 调 AI 难度

`src/game/ai/search.ts` 顶部：

```ts
export const DIFFICULTY = {
  easy:   { depth: 2, timeLimitMs: 350,  candidateLimit: 8,  randomness: 0.45 },
  normal: { depth: 4, timeLimitMs: 900,  candidateLimit: 14, randomness: 0.12 },
  hard:   { depth: 6, timeLimitMs: 1800, candidateLimit: 20, randomness: 0 },
};
```

- `depth` 搜索层数，越大越强也越慢
- `randomness` 不选最优解的概率，调高会更「像人」，调低会更「冷血」
- **不要只加深搜索**：手机上会超时。三档都保留硬保证——能成五必成五、对手冲四必堵

## 内容准确性说明

这一节比代码更重要，请先读完再用。

- **花月**：前三手 `H8 / H9 / I9`、**浦月**：`H8 / I9 / I7`。
  坐标经多个独立来源交叉核对，且国际连珠联盟（RIF）把这两个开局列为「黑必胜」。
- **白 4 后的黑 5 候选点**：中文资料普遍给出列表，但个别点经引擎核算并不形成实质棋型
  （例如花月局白 4 走 I8 时，资料列出的 J7 落在白棋已占据的斜线上）。
  课程只采用**引擎可验证**的主变，存疑的点不写进教学内容。
- **黑 5 之后的续法**：公开中文资料没有可核对的定式谱。本课**不编造手顺**，
  教学止于定式部分，后续交给实战。
- **必胜只对执黑成立**。无禁手五子棋黑棋有先手优势，白棋没有对应的必胜开局。
- 规则为**无禁手**（不判三三、四四、长连）。

`src/content.test.ts` 会把上面几条变成断言：坐标不能重复、关键手必须形成声称的棋型。
文案与棋盘不一致时，测试会失败。

## 打包安卓 APK

见 [ANDROID.md](./ANDROID.md)。云端编译，本地不需要安装 Android Studio。

## 技术选型

| 项 | 选择 | 原因 |
|---|---|---|
| 构建 | Vite 6 | 产物纯静态，构建快 |
| 框架 | React 19 + TS | 类型即文档，改代码时有护栏 |
| 样式 | Tailwind CSS 4 | 设计 token 集中，改配色不翻组件 |
| 棋盘 | SVG + viewBox | 一份代码适配 320px 到 4K，等比缩放不糊 |
| AI | 自研 Negamax + Alpha-Beta | 与教学共用同一套棋盘状态，可超时中断、可调「变笨」 |
| 状态 | 无全局 store | 页面状态进 URL，进度进 localStorage |
| 动效 | 纯 CSS | 不为几个动画引入 40KB 的库 |
