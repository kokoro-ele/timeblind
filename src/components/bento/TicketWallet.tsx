"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { concerts } from "@/lib/data";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";
import { fmt } from "@/i18n/messages";
import type { Concert } from "@/types";

const PAGE_SIZE = 3;

function formatDate(date: string): string {
  return date.replace(/-/g, ".");
}

function weekday(date: string, locale: string): string {
  try {
    return new Date(date + "T00:00:00").toLocaleDateString(locale, {
      weekday: "short",
    });
  } catch {
    return "";
  }
}

function Barcode({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, var(--color-accent) 0 1px, transparent 1px 2px, var(--color-accent) 2px 4px, transparent 4px 5px, var(--color-accent) 5px 7px, transparent 7px 9px, var(--color-accent) 9px 10px, transparent 10px 12px)",
        opacity: 0.45,
      }}
    />
  );
}

function PosterFullPreview({
  src,
  x,
  y,
}: {
  src: string;
  x: number;
  y: number;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] rounded-xl border border-white/15 bg-black/95 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.75)] backdrop-blur-sm"
      style={{
        left: Math.min(x + 18, window.innerWidth - 220),
        top: Math.max(12, Math.min(y - 8, window.innerHeight - 280)),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-[min(300px,55vh)] max-w-[min(220px,42vw)] object-contain"
      />
    </div>,
    document.body,
  );
}

function TicketStub({
  concert,
  onPosterEnter,
  onPosterMove,
  onPosterLeave,
}: {
  concert: Concert;
  onPosterEnter?: (e: MouseEvent<HTMLElement>, src: string) => void;
  onPosterMove?: (e: MouseEvent<HTMLElement>) => void;
  onPosterLeave?: () => void;
}) {
  return (
    <div className="relative mx-1 shrink-0 pt-2">
      <span className="absolute left-2 top-0 z-10 -rotate-12 text-sm opacity-70">
        📎
      </span>
      <div
        className="relative w-[88px] overflow-hidden rounded-md border border-white/10 bg-black/50 shadow-[0_8px_24px_-10px_rgba(0,255,204,0.15)] sm:w-[96px]"
        style={{ transform: "rotate(-7deg)", transformOrigin: "50% 80%" }}
      >
        <div
          className="relative h-[88px] w-full overflow-hidden bg-black sm:h-[96px]"
          style={
            concert.poster
              ? undefined
              : {
                  background: `linear-gradient(145deg, ${concert.color}88, ${concert.accent}44)`,
                }
          }
          onMouseEnter={
            concert.poster
              ? (e) => onPosterEnter?.(e, concert.poster!)
              : undefined
          }
          onMouseMove={concert.poster ? onPosterMove : undefined}
          onMouseLeave={concert.poster ? onPosterLeave : undefined}
        >
          {concert.poster ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={concert.poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15"
              />
            </>
          ) : (
            <>
              <span
                className="absolute inset-0 flex items-center justify-center text-4xl font-black"
                style={{ color: `${concert.accent}55` }}
              >
                {concert.artist.charAt(0)}
              </span>
              <span
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
                  backgroundSize: "10px 10px",
                }}
              />
            </>
          )}
        </div>
        <div className="border-t border-dashed border-white/10 bg-black/60 px-2 py-1.5">
          <Barcode className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

function TicketCard({
  concert,
  onPosterEnter,
  onPosterMove,
  onPosterLeave,
}: {
  concert: Concert;
  onPosterEnter?: (e: MouseEvent<HTMLElement>, src: string) => void;
  onPosterMove?: (e: MouseEvent<HTMLElement>) => void;
  onPosterLeave?: () => void;
}) {
  const { locale } = useLocale();
  const wd = weekday(concert.date, locale);

  return (
    <article className="group glass relative overflow-hidden rounded-xl">
      <div className="flex items-stretch gap-1 py-3 pl-2 pr-3 sm:gap-2 sm:pl-3">
        <TicketStub
          concert={concert}
          onPosterEnter={onPosterEnter}
          onPosterMove={onPosterMove}
          onPosterLeave={onPosterLeave}
        />

        <div className="min-w-0 flex-1 py-0.5">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-titanium">
            {concert.tour}
          </h3>
          <p className="mt-0.5 truncate text-sm font-medium text-titanium/80">
            {concert.artist}
          </p>

          <p className="mono mt-1.5 text-[11px] text-muted">
            {formatDate(concert.date)}
            {wd ? ` ${wd}` : ""}
            {concert.time ? ` ${concert.time}` : ""}
          </p>
          <p className="mono truncate text-[11px] text-muted">
            {concert.city} · {concert.venue}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="mono text-[10px]" style={{ color: concert.accent }}>
              {"★".repeat(concert.rating)}
            </span>
            <span className="mono text-[10px] text-muted">
              {loc(concert.genre, locale)}
            </span>
          </div>

          <p className="mono mt-2 line-clamp-2 text-[10px] italic leading-relaxed text-titanium/50">
            {loc(concert.note, locale)}
          </p>
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-40 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${concert.accent}, transparent)`,
        }}
      />
    </article>
  );
}

export default function TicketWallet() {
  const { t } = useLocale();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [posterPreview, setPosterPreview] = useState<{
    src: string;
    x: number;
    y: number;
  } | null>(null);

  const pages = Math.max(1, Math.ceil(concerts.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pages - 1);

  const slice = useMemo(
    () =>
      concerts.slice(
        clampedPage * PAGE_SIZE,
        clampedPage * PAGE_SIZE + PAGE_SIZE,
      ),
    [clampedPage],
  );

  const go = (next: number) => {
    const target = Math.min(pages - 1, Math.max(0, next));
    if (target === clampedPage) return;
    setDirection(target > clampedPage ? "next" : "prev");
    setPage(target);
  };

  return (
    <div className="flex h-full min-h-[380px] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-titanium">
          {t.concert.wallet}
        </h3>
        <span className="mono rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
          {t.concert.memorabilia}
        </span>
      </div>

      <div className="mono mb-3 text-[11px] uppercase tracking-[0.18em] text-accent">
        {t.concert.history}
      </div>

      <div
        key={clampedPage}
        className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5 ${
          direction === "next"
            ? "wallet-page-enter-next"
            : "wallet-page-enter-prev"
        }`}
      >
        {slice.map((c) => (
          <TicketCard
            key={c.id}
            concert={c}
            onPosterEnter={(e, src) =>
              setPosterPreview({ src, x: e.clientX, y: e.clientY })
            }
            onPosterMove={(e) =>
              setPosterPreview((p) =>
                p ? { ...p, x: e.clientX, y: e.clientY } : p,
              )
            }
            onPosterLeave={() => setPosterPreview(null)}
          />
        ))}
      </div>

      {posterPreview && (
        <PosterFullPreview
          src={posterPreview.src}
          x={posterPreview.x}
          y={posterPreview.y}
        />
      )}

      <div className="mono mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
        <button
          type="button"
          onClick={() => go(clampedPage - 1)}
          disabled={clampedPage === 0}
          aria-label={t.concert.prev}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-titanium/80 transition-colors enabled:hover:border-accent/50 enabled:hover:text-accent disabled:opacity-30"
        >
          ‹ {t.concert.prev}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-muted">
            {fmt(t.concert.pageOf, {
              page: clampedPage + 1,
              total: pages,
            })}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`page ${i + 1}`}
                aria-current={i === clampedPage ? "page" : undefined}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === clampedPage ? 20 : 6,
                  background:
                    i === clampedPage ? "var(--color-accent)" : "#ffffff22",
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(clampedPage + 1)}
          disabled={clampedPage >= pages - 1}
          aria-label={t.concert.next}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-titanium/80 transition-colors enabled:hover:border-accent/50 enabled:hover:text-accent disabled:opacity-30"
        >
          {t.concert.next} ›
        </button>
      </div>
    </div>
  );
}
