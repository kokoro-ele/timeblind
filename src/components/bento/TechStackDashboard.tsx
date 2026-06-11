"use client";

import { profile } from "@/lib/data";
import AsciiGarden from "@/components/fx/AsciiGarden";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";

const CATEGORY_COLOR: Record<string, string> = {
  lang: "#00ffcc",
  frontend: "#38bdf8",
  backend: "#a78bfa",
  data: "#fb923c",
  infra: "#f472b6",
};

function Bar({ level, color }: { level: number; color: string }) {
  const cells = 22;
  const filled = Math.round((level / 100) * cells);
  return (
    <span className="mono text-[11px] leading-none tracking-tighter">
      <span className="text-muted">[</span>
      {Array.from({ length: cells }).map((_, i) => (
        <span
          key={i}
          style={{ color: i < filled ? color : "transparent" }}
          className={i < filled ? "" : "text-white/8"}
        >
          {i < filled ? "|" : "."}
        </span>
      ))}
      <span className="text-muted">]</span>
    </span>
  );
}

export default function TechStackDashboard() {
  const { locale, t } = useLocale();
  return (
    <div className="flex h-full min-h-[360px] flex-col gap-4">
      {/* ascii garden */}
      <div className="relative h-32 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-black/30">
        <AsciiGarden />
        <div className="mono pointer-events-none absolute bottom-2 left-3 text-[10px] text-muted">
          {t.tech.hint}
        </div>
      </div>

      {/* htop header */}
      <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span>
          <span className="text-accent">{t.tech.tasks}:</span>{" "}
          {profile.stack.length}
        </span>
        {profile.metrics.map((m) => (
          <span key={m.label}>
            <span className="text-accent">{m.label}:</span> {m.value}
          </span>
        ))}
      </div>

      {/* htop bars */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {profile.stack.map((s) => {
          const color = CATEGORY_COLOR[s.category] ?? "#00ffcc";
          return (
            <div
              key={s.name}
              className="grid grid-cols-[1.1fr_auto_2.4rem] items-center gap-3 rounded px-1 py-0.5 hover:bg-white/[0.03]"
            >
              <span className="truncate text-xs text-titanium">{s.name}</span>
              <Bar level={s.level} color={color} />
              <span className="mono text-right text-[11px]" style={{ color }}>
                {s.level}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mono flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-muted">
        <span>{loc(profile.role, locale)}</span>
        <span className="text-accent">{profile.availability}</span>
      </div>
    </div>
  );
}
