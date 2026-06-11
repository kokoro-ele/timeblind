"use client";

import { useState } from "react";
import { commits } from "@/lib/data";
import TextScramble from "@/components/fx/TextScramble";
import HoverTip from "@/components/fx/HoverTip";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";

export default function ExperienceTimeline() {
  const { locale, t } = useLocale();
  const [active, setActive] = useState(commits.length - 1);
  const c = commits[active];

  return (
    <div className="grid h-full min-h-[360px] grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
      {/* git graph */}
      <div className="relative flex flex-col gap-0 overflow-y-auto pr-1">
        <div
          aria-hidden
          className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-accent/10 via-accent/40 to-accent/10"
        />
        {commits.map((commit, i) => {
          const selected = i === active;
          const title = loc(commit.title, locale);
          const branchTip = `${title}\n${commit.branch}`;
          return (
            <button
              key={commit.hash}
              onClick={() => setActive(i)}
              className="group relative flex items-start gap-3 py-2 text-left"
            >
              <span className="relative z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <span
                  className={`h-3.5 w-3.5 rounded-full border transition-all ${
                    selected
                      ? "border-accent bg-accent shadow-[0_0_10px_#00ffcc]"
                      : "border-white/30 bg-base group-hover:border-accent"
                  }`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`mono block text-[10px] ${
                    selected ? "text-accent" : "text-muted"
                  }`}
                >
                  {commit.hash} · {commit.date.slice(0, 7)}
                </span>
                <HoverTip
                  tip={branchTip}
                  className="block w-full"
                  place="bottom"
                  portal
                >
                  <span
                    className={`block truncate text-xs ${
                      selected ? "text-titanium" : "text-titanium/60"
                    }`}
                  >
                    {commit.branch}
                  </span>
                </HoverTip>
              </span>
            </button>
          );
        })}
      </div>

      {/* git show panel */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-black/40">
        <div className="mono flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[10px] text-muted">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
          <span className="h-2 w-2 rounded-full bg-green-500/70" />
          <span className="ml-2 truncate">git show {c.hash}</span>
        </div>

        <div className="mono min-h-0 flex-1 overflow-y-auto p-3 text-[11px] leading-relaxed">
          <div className="text-yellow-500/90">commit {c.hash}</div>
          {c.refs.length > 0 && (
            <div className="text-accent/80">({c.refs.join(", ")})</div>
          )}
          <div className="text-muted">
            {t.timeline.author}: {c.author} &lt;dev@timeblind&gt;
          </div>
          <div className="text-muted">
            {t.timeline.date}: {c.date}
          </div>

          <HoverTip
            tip={loc(c.title, locale)}
            className="mt-3 mb-1 block w-full text-titanium"
            portal
          >
            <div className="line-clamp-2 font-semibold text-accent">
              <TextScramble
                key={`title-${c.hash}-${locale}`}
                text={loc(c.title, locale)}
              />
            </div>
          </HoverTip>
          <HoverTip
            tip={loc(c.summary, locale)}
            className="mb-3 block w-full text-titanium/70"
            portal
          >
            <p className="line-clamp-3">
              <TextScramble
                key={`sum-${c.hash}-${locale}`}
                text={loc(c.summary, locale)}
                as="span"
              />
            </p>
          </HoverTip>

          {/* diff */}
          <div className="rounded border border-white/10">
            <div className="border-b border-white/10 bg-white/[0.03] px-2 py-1 text-muted">
              --- a/{c.diff.file}
              <br />
              +++ b/{c.diff.file}
            </div>
            <div className="px-2 py-1">
              {c.diff.deletions.map((line, i) => (
                <div key={`d-${i}`} className="text-red-400/90">
                  {line}
                </div>
              ))}
              {c.diff.additions.map((line, i) => (
                <div key={`a-${i}`} className="text-emerald-400/90">
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* achievements */}
          <div className="mt-3 text-muted">{t.timeline.achievements}</div>
          <ul className="mt-1 space-y-1">
            {c.achievements.map((a, i) => {
              const text = loc(a, locale);
              return (
                <li key={i} className="flex gap-2 text-titanium/80">
                  <span className="shrink-0 text-accent">▸</span>
                  <HoverTip tip={text} className="min-w-0 flex-1">
                    <span className="line-clamp-2">
                      <TextScramble
                        key={`${c.hash}-${i}-${locale}`}
                        text={text}
                        speed={0.7}
                        as="span"
                      />
                    </span>
                  </HoverTip>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
