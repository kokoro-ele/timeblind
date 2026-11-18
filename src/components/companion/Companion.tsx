"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Player } from "@livliv-dev/player";
import companion from "@data/companion.json";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc, type Localized } from "@/i18n/config";

type Line = Localized<string>;
type LineKey = Exclude<keyof typeof companion.lines, "sections">;
type SectionId = keyof typeof companion.lines.sections;

const STORAGE_KEY = "timeblind.companion.hidden";
const IDLE_MS = 25_000;
const SECTION_COOLDOWN_MS = 2_600;
const BUBBLE_HOLD_MS = 5_500;
const TYPE_MS = 26;

const POKE_ACTIONS = ["hop", "tilt", "shy", "nod"] as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** rotate through a list of lines so repeats come as late as possible */
function useRotation() {
  const counters = useRef(new Map<string, number>());
  return useCallback((key: string, list: Line[]) => {
    const n = counters.current.get(key) ?? 0;
    counters.current.set(key, n + 1);
    return list[n % list.length];
  }, []);
}

export default function Companion() {
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);

  // speech bubble: the full line, how much of it is typed, and whether it shows
  const [line, setLine] = useState<Line | null>(null);
  const [typed, setTyped] = useState(0);
  const [bubbleOn, setBubbleOn] = useState(false);
  const talkingRef = useRef(false);
  const lastSpokeRef = useRef(0);
  const next = useRotation();

  const awayRef = useRef(false);
  const pokesRef = useRef<number[]>([]);
  const sectionRef = useRef<string | null>(null);
  const localeRef = useRef(locale);
  const endSaidRef = useRef(false);

  const text = line ? loc(line, locale) : "";

  const say = useCallback(
    (l: Line, opts: { force?: boolean } = {}) => {
      const now = performance.now();
      if (!opts.force && now - lastSpokeRef.current < SECTION_COOLDOWN_MS) return false;
      lastSpokeRef.current = now;
      setLine(l);
      setTyped(prefersReducedMotion() ? Infinity : 0);
      setBubbleOn(true);
      return true;
    },
    [],
  );

  const sayKey = useCallback(
    (key: LineKey, opts?: { force?: boolean }) =>
      say(next(key, companion.lines[key] as Line[]), opts),
    [say, next],
  );

  // ---- hidden state, persisted per viewer --------------------------------
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setHidden(true);
    } catch {}
  }, []);

  const setHiddenPersist = (h: boolean) => {
    setHidden(h);
    try {
      localStorage.setItem(STORAGE_KEY, h ? "1" : "0");
    } catch {}
  };

  // ---- the player: created once, loaded lazily, released on unmount ------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let player: Player | null = null;

    (async () => {
      const { Player } = await import("@livliv-dev/player");
      if (cancelled) return;
      if (!Player.isSupported()) {
        setFailed(true);
        return;
      }
      player = new Player(canvas, { followPointer: "page", maxPixelRatio: 2 });
      playerRef.current = player;

      // fake lip sync: while the bubble is typing, the mouth flaps with the text
      player.use({
        update(frame) {
          if (!talkingRef.current) return;
          const t = frame.time;
          frame.params.mouthOpen =
            0.15 + 0.55 * Math.abs(Math.sin(t * 17)) * (0.6 + 0.4 * Math.sin(t * 5.3));
          frame.params.vowel = Math.sin(t * 3.1);
        },
      });

      try {
        await player.load(companion.model, { poster: companion.cover });
        if (cancelled) return;
        setReady(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.warn("[companion]", e);
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      player?.dispose({ release: true });
      playerRef.current = null;
    };
  }, []);

  // no frames while she is put away
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready) return;
    if (hidden) player.pause();
    else player.play();
  }, [hidden, ready]);

  // greet once she is on screen
  useEffect(() => {
    if (!ready || hidden) return;
    const id = setTimeout(() => {
      playerRef.current?.act("nod");
      sayKey("greet", { force: true });
    }, 700);
    return () => clearTimeout(id);
  }, [ready, hidden, sayKey]);

  // ---- typewriter + bubble lifetime --------------------------------------
  useEffect(() => {
    if (!bubbleOn) {
      talkingRef.current = false;
      return;
    }
    if (typed < text.length) {
      talkingRef.current = true;
      const id = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
      return () => clearTimeout(id);
    }
    talkingRef.current = false;
    const id = setTimeout(() => setBubbleOn(false), BUBBLE_HOLD_MS);
    return () => clearTimeout(id);
  }, [bubbleOn, typed, text]);

  // ---- reacting to the page ----------------------------------------------
  useEffect(() => {
    if (!ready || hidden) return;
    const player = playerRef.current;
    if (!player) return;

    const reactToSection = (id: string, force = false) => {
      const lines = companion.lines.sections[id as SectionId] as Line[] | undefined;
      if (!lines) return true;
      const key = `s:${id}`;
      const spoke = say(next(key, lines), { force });
      if (spoke) {
        player.setExpression(id === "concerts" || id === "projects" ? "smile" : null, 0.7);
      }
      return spoke;
    };

    // hovering a bento card: comment on it once per entry. A line held back by the
    // cooldown is retried once the cooldown ends, if the pointer is still in that card.
    let hoverId: string | null = null;
    let retryTimer = 0;
    const tryHovered = () => {
      clearTimeout(retryTimer);
      if (!hoverId || hoverId === sectionRef.current) return;
      if (reactToSection(hoverId)) {
        sectionRef.current = hoverId;
      } else {
        const wait = SECTION_COOLDOWN_MS - (performance.now() - lastSpokeRef.current);
        retryTimer = window.setTimeout(tryHovered, Math.max(50, wait + 20));
      }
    };
    const onOver = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const card = (e.target as Element | null)?.closest?.("[data-bento]");
      const id = card?.getAttribute("data-bento") ?? null;
      if (id === hoverId) return;
      hoverId = id;
      if (!id) sectionRef.current = null;
      tryHovered();
    };

    // dock / command palette navigation
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      sectionRef.current = id;
      player.act("nod", 0.6);
      reactToSection(id, true);
    };

    const onPalette = (e: Event) => {
      if ((e as CustomEvent<boolean>).detail) {
        player.act("tilt", 0.7);
        sayKey("palette", { force: true });
      }
    };

    // reaching the bottom of the page
    const onScroll = () => {
      if (endSaidRef.current) return;
      const atEnd =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40;
      if (atEnd) {
        endSaidRef.current = true;
        player.act("hop", 0.8);
        player.setExpression("smile");
        sayKey("end", { force: true });
      }
    };

    // dozing off when nobody moves, waking up when they come back
    let idleTimer = 0;
    const armIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        awayRef.current = true;
        player.setAway(true);
        sayKey("away", { force: true });
      }, IDLE_MS);
    };
    const onActivity = () => {
      if (awayRef.current) {
        awayRef.current = false;
        player.setAway(false);
        player.act("hop", 0.7);
        sayKey("back", { force: true });
      }
      armIdle();
    };

    armIdle();
    document.addEventListener("pointerover", onOver);
    window.addEventListener("timeblind:focus", onFocus);
    window.addEventListener("timeblind:palette", onPalette);
    window.addEventListener("scroll", onScroll, { passive: true });
    for (const ev of ["pointermove", "keydown", "scroll", "touchstart"] as const) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    return () => {
      clearTimeout(idleTimer);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("timeblind:focus", onFocus);
      window.removeEventListener("timeblind:palette", onPalette);
      window.removeEventListener("scroll", onScroll);
      for (const ev of ["pointermove", "keydown", "scroll", "touchstart"] as const) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [ready, hidden, say, sayKey, next]);

  // switching language: answer in the new one
  useEffect(() => {
    if (localeRef.current === locale) return;
    localeRef.current = locale;
    if (!ready || hidden) return;
    playerRef.current?.act("hop", 0.6);
    sayKey("locale", { force: true });
  }, [locale, ready, hidden, sayKey]);

  // ---- poking her ----------------------------------------------------------
  const onPoke = (e: PointerEvent<HTMLButtonElement>) => {
    const player = playerRef.current;
    const canvas = canvasRef.current;
    if (!player || !canvas || !ready) return;
    const r = canvas.getBoundingClientRect();
    const [mx, my] = player.canvasToModel(e.clientX - r.left, e.clientY - r.top);
    player.poke(mx, my, 1.4);

    const now = performance.now();
    pokesRef.current = [...pokesRef.current.filter((t) => now - t < 2_000), now];
    if (pokesRef.current.length >= 5) {
      pokesRef.current = [];
      player.setExpression(null);
      player.act("shake");
      sayKey("annoyed", { force: true });
      return;
    }
    player.act(POKE_ACTIONS[Math.floor(Math.random() * POKE_ACTIONS.length)]);
    player.setExpression("smile", 0.8);
    sayKey("poke", { force: true });
  };

  if (failed) return null;

  return (
    <>
      {/* the character */}
      <div
        className={`pointer-events-none fixed bottom-24 right-2 z-30 transition-[opacity,transform] duration-500 ease-out sm:bottom-4 sm:right-4 ${
          hidden ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"
        }`}
        aria-hidden={hidden}
      >
        {/* speech bubble */}
        <div
          role="status"
          aria-live="polite"
          className={`glass mono absolute bottom-[78%] bg-[#060608]/95! right-[72%] w-[min(240px,60vw)] rounded-xl rounded-br-sm px-3 py-2.5 text-[11px] leading-relaxed text-titanium transition-[opacity,transform] duration-300 sm:right-[80%] ${
            bubbleOn && !hidden ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-accent">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_6px_#00ffcc]" />
            {companion.name}.exe
          </div>
          <span>{text.slice(0, typed)}</span>
          {typed < text.length ? <span className="caret" /> : null}
        </div>

        <div className="group/companion relative h-[170px] w-[120px] sm:h-[300px] sm:w-[210px]">
          {/* holographic floor ring */}
          <div
            aria-hidden
            className="absolute inset-x-[8%] bottom-0 h-6 rounded-[50%] border border-accent/40 bg-[radial-gradient(closest-side,rgba(0,255,204,0.35),transparent)] blur-[1px]"
          />
          <div
            aria-hidden
            className="absolute inset-x-[18%] bottom-1.5 h-3 animate-pulse rounded-[50%] border border-accent/25"
          />

          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full transition-opacity duration-700 [mask-image:linear-gradient(to_bottom,black_78%,transparent)] ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* hologram scanlines over her */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,255,204,0.05)_0px,rgba(0,255,204,0.05)_1px,transparent_1px,transparent_3px)] mix-blend-screen [mask-image:linear-gradient(to_bottom,black_78%,transparent)]"
          />

          {/* the poke target: roughly her silhouette, so the corners stay clickable for the page */}
          <button
            type="button"
            aria-label={`Poke ${companion.name}`}
            tabIndex={hidden ? -1 : 0}
            onPointerDown={onPoke}
            onPointerEnter={() => playerRef.current?.setExpression("smile", 0.5)}
            onPointerLeave={() => playerRef.current?.setExpression(null)}
            className={`absolute inset-x-[22%] bottom-[6%] top-[4%] cursor-pointer rounded-[40%] focus-visible:outline-2 focus-visible:outline-accent ${
              hidden ? "pointer-events-none" : "pointer-events-auto"
            }`}
          />

          {/* controls, shown on hover */}
          <div
            className={`absolute -top-1 right-0 flex items-center gap-1 opacity-0 transition-opacity group-hover/companion:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
              hidden ? "pointer-events-none" : "pointer-events-auto"
            }`}
          >
            <a
              href={companion.credit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mono rounded border border-white/10 bg-black/70 px-1.5 py-0.5 text-[9px] text-muted hover:text-accent"
            >
              {companion.credit.label}
            </a>
            <button
              type="button"
              onClick={() => setHiddenPersist(true)}
              aria-label="Hide companion"
              className="mono rounded border border-white/10 bg-black/70 px-1.5 py-0.5 text-[10px] text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* restore chip */}
      <button
        type="button"
        onClick={() => setHiddenPersist(false)}
        className={`glass mono fixed bottom-24 right-3 z-30 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] text-muted transition-[opacity,transform] duration-300 hover:text-accent sm:bottom-5 sm:right-5 ${
          hidden ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
        tabIndex={hidden ? 0 : -1}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#00ffcc]" />
        {companion.name}.exe
      </button>
    </>
  );
}
