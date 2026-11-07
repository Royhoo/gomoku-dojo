import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-pine)] text-white hover:bg-[#27503f] active:bg-[#204435] disabled:bg-[#b9c6c0]",
  ghost:
    "bg-white/70 text-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-ink-faint)] disabled:text-[var(--color-ink-faint)]",
  quiet:
    "bg-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] disabled:text-[var(--color-ink-faint)]",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-3.5 text-[13px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] font-medium transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </div>
  );
}

/** 细进度条 */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
      <div
        className="h-full rounded-full bg-[var(--color-pine)] transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** 小标签 */
export function Tag({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "pine" | "cinnabar";
}) {
  const tones = {
    ink: "bg-[var(--color-paper-deep)] text-[var(--color-ink-soft)]",
    pine: "bg-[var(--color-pine-soft)] text-[var(--color-pine)]",
    cinnabar: "bg-[var(--color-cinnabar-soft)] text-[var(--color-cinnabar)]",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
