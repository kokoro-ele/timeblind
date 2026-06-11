import type { ReactNode } from "react";

export function BentoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {children}
    </div>
  );
}

interface BentoCardProps {
  id: string;
  title: string;
  /** short mono label rendered in the card header, e.g. "01 // tech" */
  tag?: string;
  className?: string;
  /** subtle accent colour for the header rule + glow */
  accent?: string;
  children: ReactNode;
  /** when true the body has no padding (full-bleed canvas modules) */
  bleed?: boolean;
}

export function BentoCard({
  id,
  title,
  tag,
  className = "",
  accent = "#00ffcc",
  children,
  bleed = false,
}: BentoCardProps) {
  return (
    <section
      id={id}
      data-bento={id}
      className={`group glass scanlines relative flex scroll-mt-28 flex-col overflow-hidden rounded-2xl ${className}`}
    >
      {/* top accent hairline that lights up on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <h2 className="text-sm font-medium tracking-tight text-titanium">
            {title}
          </h2>
        </div>
        {tag ? (
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {tag}
          </span>
        ) : null}
      </header>

      <div className={`relative min-h-0 flex-1 ${bleed ? "" : "px-5 pb-5"}`}>
        {children}
      </div>
    </section>
  );
}
