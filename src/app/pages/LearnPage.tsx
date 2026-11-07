import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LessonPlayer } from "../../lesson/LessonPlayer";
import { getOpening } from "../../openings";
import { markLessonDone, saveLast } from "../../core/progress";
import type { BoardThemeId } from "../../board/theme";

const THEME: BoardThemeId = "wood";

export function LearnPage() {
  const { openingId = "", lessonId = "", step = "-1" } = useParams();
  const navigate = useNavigate();

  const opening = getOpening(openingId);
  const lessonIndex = opening ? opening.lessons.findIndex((l) => l.id === lessonId) : -1;
  const lesson = opening && lessonIndex >= 0 ? opening.lessons[lessonIndex] : undefined;
  const stepNum = Number.isFinite(Number(step)) ? Number(step) : -1;

  // 章不存在时回首页，避免白屏
  useEffect(() => {
    if (!opening || !lesson) navigate("/", { replace: true });
  }, [opening, lesson, navigate]);

  useEffect(() => {
    if (opening && lesson) saveLast(opening.id, lesson.id, stepNum);
  }, [opening, lesson, stepNum]);

  const prevLesson = useMemo(
    () => (opening && lessonIndex > 0 ? opening.lessons[lessonIndex - 1] : null),
    [opening, lessonIndex],
  );
  const nextLesson = useMemo(
    () =>
      opening && lessonIndex >= 0 && lessonIndex < opening.lessons.length - 1
        ? opening.lessons[lessonIndex + 1]
        : null,
    [opening, lessonIndex],
  );

  if (!opening || !lesson) return null;

  const goStep = (next: number) => {
    const clamped = Math.max(-1, Math.min(next, lesson.moves.length - 1));
    navigate(`/learn/${opening.id}/${lesson.id}/${clamped}`);
  };

  const complete = () => {
    markLessonDone(opening.id, lesson.id);
    if (nextLesson) {
      navigate(`/learn/${opening.id}/${nextLesson.id}/-1`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          to="/"
          className="text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          ← 道场
        </Link>
        <span className="text-[var(--color-line)]">/</span>
        <span className="text-[13px] text-[var(--color-ink-soft)]">{opening.name}</span>
        <span className="text-[var(--color-line)]">/</span>
        <span className="text-[13px] text-[var(--color-ink)]">{lesson.title}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        {/* 章节目录：手机隐藏，桌面常驻 */}
        <nav className="hidden lg:block">
          <p className="mb-2 text-[11.5px] tracking-wide text-[var(--color-ink-faint)]">
            目录
          </p>
          <ol className="space-y-0.5">
            {opening.lessons.map((l, i) => {
              const active = l.id === lesson.id;
              return (
                <li key={l.id}>
                  <Link
                    to={`/learn/${opening.id}/${l.id}/-1`}
                    className={`block rounded-[8px] px-2.5 py-1.5 text-[12.5px] leading-snug transition-colors ${
                      active
                        ? "bg-[var(--color-pine-soft)] text-[var(--color-pine)]"
                        : "text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-deep)]"
                    }`}
                  >
                    <span className="mr-1.5 tabular-nums text-[var(--color-ink-faint)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {l.title}
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 border-t border-[var(--color-line)] pt-3">
            <Link
              to="/play"
              className="text-[12.5px] text-[var(--color-pine)] hover:underline"
            >
              去下一局 →
            </Link>
          </div>
        </nav>

        <LessonPlayer
          opening={opening}
          lesson={lesson}
          step={stepNum}
          themeId={THEME}
          onStepChange={goStep}
          onLessonComplete={complete}
          onGoSparring={() => navigate("/play")}
          onPrevLesson={
            prevLesson ? () => navigate(`/learn/${opening.id}/${prevLesson.id}/-1`) : undefined
          }
          onNextLesson={
            nextLesson ? () => navigate(`/learn/${opening.id}/${nextLesson.id}/-1`) : undefined
          }
        />
      </div>
    </div>
  );
}
