"use client";

import { useEffect, useState } from "react";
import { profile } from "@/lib/data";
import { injectConsoleEasterEgg } from "@/lib/easterEgg";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";

function useClock(timeZone: string) {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone]);
  return time;
}

export default function SystemState() {
  const { locale, t } = useLocale();
  const time = useClock(profile.timezone);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    injectConsoleEasterEgg(profile);
    const id = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full min-h-[200px] flex-col justify-between gap-4">
      <div className="mono space-y-1.5 text-[13px] leading-relaxed">
        <div className="flex flex-wrap items-center gap-x-2 text-titanium">
          <span className="text-muted">{t.system.status}:</span>
          <span className="inline-flex items-center gap-1.5 text-accent glow-text">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent shadow-[0_0_8px_#00ffcc]" />
            {profile.status}
          </span>
          <span className="text-muted">//</span>
          <span className="text-muted">{t.system.loc}:</span>
          <span className="text-titanium">{loc(profile.location, locale)}</span>
          <span className="text-muted">//</span>
          <span className="text-muted">{t.system.time}:</span>
          <span className="text-titanium tabular-nums">{time}</span>
        </div>
        <div className="text-titanium/70">
          <span className="text-muted">$</span> {t.system.mission}
        </div>
        <div className="text-titanium">{loc(profile.tagline, locale)}</div>
        <div className="text-titanium/60">{loc(profile.bio, locale)}</div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div className="flex flex-wrap gap-2">
          {profile.socials.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mono rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-titanium/80 transition-colors hover:border-accent/50 hover:text-accent"
            >
              {s.label} <span className="text-muted">↗</span>
            </a>
          ))}
        </div>
        <div className="mono text-[10px] text-muted">
          {t.system.uptime} {String(Math.floor(uptime / 60)).padStart(2, "0")}:
          {String(uptime % 60).padStart(2, "0")} · {t.system.console}{" "}
          <span className="text-accent">⌘</span>
        </div>
      </div>
    </div>
  );
}
