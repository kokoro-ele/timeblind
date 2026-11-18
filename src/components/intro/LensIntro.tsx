"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { profile } from "@/lib/data";
import { COMPANION_READY, announceEnter, introState } from "@/lib/intro";

const BLADES = 7;
const OPEN_MS = 1250;
const MAX_WAIT_MS = 6000; // enter anyway if the companion never gets ready
const VOICE_KEY = "timeblind.companion.voice";

type Phase = "loading" | "ready" | "opening" | "done";

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** a short mechanical shutter: a whirr while the blades turn, a click as they open */
function playShutter() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.22;
    out.connect(ctx.destination);

    const click = (at: number, freq: number, level: number) => {
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = freq;
      band.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.value = level;
      src.connect(band).connect(g).connect(out);
      src.start(now + at);
    };

    const whirr = ctx.createOscillator();
    whirr.type = "sawtooth";
    whirr.frequency.setValueAtTime(70, now);
    whirr.frequency.exponentialRampToValueAtTime(190, now + OPEN_MS / 1000);
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 900;
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0, now);
    wg.gain.linearRampToValueAtTime(0.12, now + 0.08);
    wg.gain.linearRampToValueAtTime(0, now + OPEN_MS / 1000);
    whirr.connect(low).connect(wg).connect(out);
    whirr.start(now);
    whirr.stop(now + OPEN_MS / 1000 + 0.05);

    click(0, 3200, 1);
    click(OPEN_MS / 1000 - 0.08, 2400, 0.8);
    setTimeout(() => ctx.close(), OPEN_MS + 600);
  } catch {}
}

export default function LensIntro() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const phaseRef = useRef<Phase>("loading");
  phaseRef.current = phase;

  const rotorRef = useRef<SVGGElement>(null);
  const bladeRefs = useRef<(SVGPathElement | null)[]>([]);
  const pupilRef = useRef<SVGGElement>(null);
  const openedAt = useRef(0);
  const from = useRef({ r: 0, a: 0 });

  // no scrolling the page behind a closed lens
  useEffect(() => {
    if (phase === "done") return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [phase]);

  // wait for the companion (so her first word can be heard), with a ceiling
  useEffect(() => {
    const started = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, 700 - (performance.now() - started)); // let the focus animation read
      setTimeout(() => {
        setProgress(100);
        setPhase((p) => (p === "loading" ? "ready" : p));
      }, wait);
    };
    if (introState.companionReady) finish();
    window.addEventListener(COMPANION_READY, finish);
    const ceiling = setTimeout(finish, MAX_WAIT_MS);
    const tick = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.max(1, Math.round((92 - p) / 9))));
    }, 90);
    return () => {
      window.removeEventListener(COMPANION_READY, finish);
      clearTimeout(ceiling);
      clearInterval(tick);
    };
  }, []);

  const enter = useCallback(() => {
    if (phaseRef.current !== "ready") return;
    announceEnter(); // inside the gesture: the companion unlocks sound from here
    let muted = false;
    try {
      muted = localStorage.getItem(VOICE_KEY) === "0";
    } catch {}
    if (!muted) playShutter();
    openedAt.current = performance.now();
    setPhase("opening");
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, enter]);

  // the blades: one loop sets every blade's distance from the center and the rotor's turn
  useEffect(() => {
    if (phase === "done") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const openMs = reduced ? 450 : OPEN_MS;
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      const s = (now - t0) / 1000;
      let r: number;
      let a: number;
      let pupil = 1;
      const p = phaseRef.current;
      if (p === "opening") {
        const k = Math.min(1, (now - openedAt.current) / openMs);
        const e = easeInOutCubic(k);
        r = from.current.r + (175 - from.current.r) * e;
        a = from.current.a + (reduced ? 0 : 80) * e;
        pupil = Math.max(0, 1 - k * 3);
        if (k >= 1) {
          setPhase("done");
          return;
        }
      } else if (p === "ready") {
        r = 13 + 1.6 * Math.sin(s * 2.2);
        a = -8 + 3 * Math.sin(s * 0.9);
      } else {
        // focusing: the aperture hunts while it loads
        r = 5 + 2.5 * Math.abs(Math.sin(s * 1.7));
        a = -8 + 10 * Math.sin(s * 1.3);
      }
      from.current = p === "opening" ? from.current : { r, a };
      rotorRef.current?.setAttribute("transform", `rotate(${a.toFixed(2)})`);
      for (const blade of bladeRefs.current) {
        blade?.setAttribute("transform", `translate(0 ${(-r).toFixed(2)})`);
      }
      pupilRef.current?.setAttribute("opacity", pupil.toFixed(2));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase === "done") return null;

  const opening = phase === "opening";
  const ready = phase === "ready";

  return (
    <div
      id="lens-intro"
      className="fixed inset-0 z-[100] select-none"
      aria-label="Intro"
      onClick={ready ? enter : undefined}
    >
      <noscript>
        <style>{`#lens-intro{display:none!important}html{overflow:auto!important}`}</style>
      </noscript>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="-100 -100 200 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id="lens-pupil" cx="38%" cy="35%" r="70%">
            <stop offset="0" stopColor="#1d3b39" />
            <stop offset="0.35" stopColor="#081413" />
            <stop offset="1" stopColor="#020303" />
          </radialGradient>
          <radialGradient id="lens-glint" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#00ffcc" stopOpacity="0.55" />
            <stop offset="1" stopColor="#00ffcc" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lens-blade" x1="0" y1="0" x2="0" y2="-1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#1a1a1f" />
            <stop offset="0.08" stopColor="#111114" />
            <stop offset="1" stopColor="#08080a" />
          </linearGradient>
        </defs>

        {/* the glass, seen through the aperture while it is nearly shut */}
        <g ref={pupilRef}>
          <circle r="24" fill="url(#lens-pupil)" />
          <circle r="9" fill="url(#lens-glint)" />
          <circle cx="-5" cy="-6" r="2.2" fill="#ffffff" opacity="0.5" />
          <circle cx="4" cy="5" r="1" fill="#ffffff" opacity="0.25" />
        </g>

        {/* each blade covers everything beyond one edge of the opening */}
        <g ref={rotorRef}>
          {Array.from({ length: BLADES }, (_, i) => (
            <g key={i} transform={`rotate(${(i * 360) / BLADES})`}>
              <path
                ref={(el) => {
                  bladeRefs.current[i] = el;
                }}
                d="M -60 0 L 400 0 L 400 -420 L -420 -420 Z"
                fill="url(#lens-blade)"
                stroke="#00ffcc"
                strokeOpacity="0.22"
                strokeWidth="0.35"
              />
            </g>
          ))}
        </g>
      </svg>

      {/* HUD: lens barrel markings, focus readout, the shutter button */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          opening ? "opacity-0" : "opacity-100"
        }`}
      >
        <svg
          viewBox="-100 -100 200 200"
          className="absolute h-[min(78vmin,560px)] w-[min(78vmin,560px)] animate-[spin_40s_linear_infinite] motion-reduce:animate-none"
          aria-hidden
        >
          <defs>
            <path id="lens-ring" d="M 0 -88 A 88 88 0 1 1 -0.01 -88" />
          </defs>
          <circle r="96" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
          <circle r="80" fill="none" stroke="#00ffcc" strokeOpacity="0.15" strokeDasharray="0.6 3.6" />
          <text className="mono" fontSize="5.2" letterSpacing="2.4" fill="#71717a">
            <textPath href="#lens-ring">
              {`${profile.handle.toUpperCase()} · ZETIAN YU · 35mm f/1.4 · ∞ · ${profile.handle.toUpperCase()} · FULL-STACK / AI · 1:1.4 ·`}
            </textPath>
          </text>
        </svg>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            enter();
          }}
          disabled={!ready}
          autoFocus
          className={`pointer-events-auto relative flex h-36 w-36 flex-col items-center justify-center rounded-full border text-center transition-[border-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
            ready
              ? "cursor-pointer border-accent/60 shadow-[0_0_40px_-6px_#00ffcc] hover:scale-105"
              : "cursor-wait border-white/10"
          }`}
        >
          {ready ? (
            <>
              <span className="mono text-[10px] uppercase tracking-[0.3em] text-accent">● rec</span>
              <span className="mt-1 text-sm font-medium text-titanium">{t.intro.enter}</span>
            </>
          ) : (
            <>
              <span className="mono text-[10px] uppercase tracking-[0.25em] text-muted">{t.intro.loading}</span>
              <span className="mono mt-1 text-lg tabular-nums text-titanium">{progress}%</span>
            </>
          )}
        </button>

        <div
          className={`mono absolute bottom-[12vh] text-[10px] uppercase tracking-[0.25em] text-muted transition-opacity duration-500 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          {t.intro.hint}
        </div>
      </div>
    </div>
  );
}
