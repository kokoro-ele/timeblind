"use client";

import { useCallback, useEffect, useState } from "react";
import { Command } from "cmdk";
import { NAV_ITEMS, focusSection } from "@/lib/nav";
import { profile } from "@/lib/data";
import { useT } from "@/i18n/LocaleProvider";
import { fmt } from "@/i18n/messages";
import { Icon } from "./Icons";

export default function CommandPalette() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    // wait for the dialog to unmount before scrolling
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }, []);

  return (
    <>
      {/* always-on trigger bar */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <button
          onClick={() => setOpen(true)}
          className="glass pointer-events-auto group flex w-full max-w-md items-center gap-3 rounded-full px-4 py-2.5 text-left transition-colors hover:border-accent/40"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="text-muted group-hover:text-accent"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="mono flex-1 text-xs text-muted">
            {fmt(t.command.cta, { key: isMac ? "\u2318K" : "Ctrl+K" })}
          </span>
          <kbd className="mono rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
            {isMac ? "\u2318K" : "^K"}
          </kbd>
        </button>
      </div>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed inset-0 z-50"
      >
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <div className="absolute left-1/2 top-[18vh] w-[92vw] max-w-lg -translate-x-1/2">
          <div className="glass overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4">
              <span className="mono text-accent">{">"}</span>
              <Command.Input
                autoFocus
                placeholder={t.command.placeholder}
                className="mono w-full bg-transparent py-4 text-sm text-titanium outline-none placeholder:text-muted"
              />
            </div>
            <Command.List className="max-h-[320px] overflow-y-auto p-2">
              <Command.Empty className="mono px-3 py-6 text-center text-xs text-muted">
                {t.command.empty}
              </Command.Empty>

              <Command.Group
                heading={t.command.navigate}
                className="mono px-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted [&_[cmdk-group-items]]:mt-1"
              >
                {NAV_ITEMS.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${t.nav[item.id]} ${item.keywords.join(
                      " ",
                    )}`}
                    onSelect={() => run(() => focusSection(item.id))}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-titanium aria-selected:bg-accent/10 aria-selected:text-accent"
                  >
                    <Icon name={item.icon} className="h-4 w-4 opacity-80" />
                    <span>{t.nav[item.id]}</span>
                    <span className="mono ml-auto text-[10px] text-muted">
                      #{item.id}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading={t.command.links}
                className="mono px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.2em] text-muted [&_[cmdk-group-items]]:mt-1"
              >
                {profile.socials.map((s) => (
                  <Command.Item
                    key={s.url}
                    value={`${s.label} ${s.handle} link`}
                    onSelect={() =>
                      run(() => window.open(s.url, "_blank", "noopener"))
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-titanium aria-selected:bg-accent/10 aria-selected:text-accent"
                  >
                    <Icon name="github" className="h-4 w-4 opacity-80" />
                    <span>{s.label}</span>
                    <span className="mono ml-auto text-[10px] text-muted">
                      {s.handle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}
