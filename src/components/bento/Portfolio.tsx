"use client";

import { projects } from "@/lib/data";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";

export default function Portfolio() {
  const { locale } = useLocale();
  return (
    <div className="flex flex-col gap-3">
      {projects.map((project, index) => (
        <a
          key={project.name}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/project min-w-0 rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-accent/50 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <div className="mono mb-2 flex items-center justify-between gap-3 text-[10px] tracking-wider" style={{ color: project.color }}>
            <span>{String(index + 1).padStart(2, "0")} // {loc(project.category, locale)}</span>
            <span aria-hidden="true">↗</span>
          </div>
          <h3 className="text-lg font-semibold text-titanium group-hover/project:text-accent">{project.name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-titanium/70">{loc(project.description, locale)}</p>
          <div className="mono mt-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => <span key={tag} className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-muted">{tag}</span>)}
          </div>
        </a>
      ))}
    </div>
  );
}
