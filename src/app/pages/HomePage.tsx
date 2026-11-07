import { Link, useNavigate } from "react-router-dom";
import { Button, Card, ProgressBar, Tag } from "../../components/ui";
import { parseCoord } from "../../game/coords";
import { OPENINGS } from "../../openings";
import { isLessonDone, loadProgress, openingProgress } from "../../core/progress";

/**
 * 开局缩略图：把定式前三手画成小棋盘。
 * 用真实棋型当封面，比放一张装饰图信息量大得多。
 */
function MiniOpening({ moves }: { moves: string[] }) {
  const size = 96;
  const pad = 10;
  const cell = (size - pad * 2) / 6;
  const roles = ["black", "white", "black"] as const;

  // 以第一手（天元）为视野中心，取 ±3 路
  const center = parseCoord(moves[0]);
  const stones = moves.map((c, i) => {
    const p = parseCoord(c);
    return {
      x: p.x - center.x + 3,
      y: p.y - center.y + 3,
      role: roles[i],
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-20 w-20 shrink-0">
      <rect width={size} height={size} rx="10" fill="#E6D2AF" />
      <g stroke="#8A6E4B" strokeWidth="0.7" opacity="0.6">
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <line x1={pad} y1={pad + i * cell} x2={size - pad} y2={pad + i * cell} />
            <line x1={pad + i * cell} y1={pad} x2={pad + i * cell} y2={size - pad} />
          </g>
        ))}
      </g>
      <circle cx={pad + 3 * cell} cy={pad + 3 * cell} r={1.6} fill="#6B5334" />
      {stones.map((s, i) => (
        <circle
          key={i}
          cx={pad + s.x * cell}
          cy={pad + s.y * cell}
          r={cell * 0.4}
          fill={s.role === "black" ? "#1C1917" : "#FFFFFF"}
          stroke={s.role === "black" ? "#000" : "#B8AE9C"}
          strokeWidth="0.7"
        />
      ))}
    </svg>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const progress = loadProgress();

  const continueTarget = (() => {
    if (!progress.last) return null;
    return `/learn/${progress.last.openingId}/${progress.last.lessonId}/${progress.last.step}`;
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-9">
        <h1 className="text-[30px] leading-tight tracking-tight sm:text-[38px]">
          五子棋道场
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-ink-soft)]">
          把必胜开局拆成一手一手，讲清楚为什么下这里、为什么不那样下。
          <br className="hidden sm:block" />
          学会之后，下一局跟机器试试。
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button
            onClick={() =>
              navigate(continueTarget ?? `/learn/${OPENINGS[0].id}/${OPENINGS[0].lessons[0].id}/-1`)
            }
          >
            {continueTarget ? "继续上次学习" : "开始学第一课"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/play")}>
            直接下一局
          </Button>
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px]">开局库</h2>
          <span className="text-[12px] text-[var(--color-ink-faint)]">
            目前 {OPENINGS.length} 个 · 还在增加
          </span>
        </div>

        <div className="space-y-3">
          {OPENINGS.map((opening) => {
            const { done, total } = openingProgress(progress, opening.id, opening.lessons.length);
            const finished = done >= total;
            return (
              <Card key={opening.id} className="p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-start gap-4">
                  <MiniOpening moves={opening.openingMoves} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[18px]">{opening.name}</h3>
                      <Tag tone={opening.side === "black" ? "cinnabar" : "ink"}>
                        {opening.side === "black" ? "黑必胜" : "白必胜"}
                      </Tag>
                      <Tag>{opening.category}</Tag>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                      {opening.intro}
                    </p>

                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="w-28">
                        <ProgressBar value={done} max={total} />
                      </div>
                      <span className="text-[11.5px] text-[var(--color-ink-faint)]">
                        {finished ? "已学完" : `${done} / ${total} 章`}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(`/learn/${opening.id}/${opening.lessons[0].id}/-1`)
                        }
                      >
                        {done > 0 ? "继续" : "开始"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/learn/${opening.id}/${opening.lessons[0].id}/-1`)}
                      >
                        看目录
                      </Button>
                    </div>
                  </div>
                </div>

                <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-[var(--color-line)] pt-2.5 sm:grid-cols-2">
                  {opening.lessons.map((l, i) => (
                    <li key={l.id} className="min-w-0">
                      <Link
                        to={`/learn/${opening.id}/${l.id}/-1`}
                        title={l.title}
                        className={`flex items-baseline gap-1.5 truncate text-[12px] ${
                          isLessonDone(progress, opening.id, l.id)
                            ? "text-[var(--color-pine)]"
                            : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                        }`}
                      >
                        <span className="tabular-nums opacity-60">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate">
                          {isLessonDone(progress, opening.id, l.id) ? "✓ " : ""}
                          {l.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <footer className="mt-10 border-t border-[var(--color-line)] pt-5 text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
        本课只讲「执黑」的必胜开局——无禁手规则下黑棋确有先手优势，白棋没有对应的必胜开局。
        AI 为本地计算，不联网。
      </footer>
    </div>
  );
}
