"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPANION_READY, announceEnter, introState } from "@/lib/intro";

const BLADES = 7;
const HOLE = 56; // aperture radius; the stage is drawn in a -100..100 box
const OPEN_MS = 1800;
const MAX_WAIT_MS = 6000; // enter anyway if the companion never gets ready
const VOICE_KEY = "timeblind.companion.voice";
const BLADE = "M -40 0 L 140 0 L 140 -160 L -200 -160 Z";
const NAME = "TIMEBLIND OPTICS  ✦  NOCTURNE 1:1.4 / 35 ASPH  ✦  ZETIAN YU  ✦  FULL-STACK · AI  ✦  TOKYO  ✦  Ø58  ✦";
const NAME_R = 66.5;

type Phase = "loading" | "ready" | "opening" | "done";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** an annulus from `from` to `to` (percent of the radius) */
function ring(from: number, to: number): CSSProperties {
  const m = `radial-gradient(circle closest-side, transparent ${from}%, #000 ${from + 0.25}%, #000 ${to - 0.25}%, transparent ${to}%)`;
  return { maskImage: m, WebkitMaskImage: m };
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .9 0 0 0 -.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** streaks along x, wrapping so the tile repeats without a seam */
function brushedTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) return "";
  for (let i = 0; i < 1600; i++) {
    const y = Math.random() * size;
    const x = Math.random() * size;
    const len = 30 + Math.random() * 180;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${0.02 + Math.random() * 0.09})` : `rgba(0,0,0,${0.05 + Math.random() * 0.15})`;
    g.lineWidth = 0.4 + Math.random() * 0.9;
    for (const dx of [0, -size]) {
      g.beginPath();
      g.moveTo(x + dx, y);
      g.lineTo(x + dx + len, y);
      g.stroke();
    }
  }
  return c.toDataURL("image/png");
}

/** a short mechanical shutter: a whirr while the blades turn, a click as they open */
function playShutter() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const dur = (OPEN_MS * 0.55) / 1000;
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
    whirr.frequency.exponentialRampToValueAtTime(190, now + dur);
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 900;
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0, now);
    wg.gain.linearRampToValueAtTime(0.12, now + 0.08);
    wg.gain.linearRampToValueAtTime(0, now + dur);
    whirr.connect(low).connect(wg).connect(out);
    whirr.start(now);
    whirr.stop(now + dur + 0.05);

    click(0, 3200, 1);
    click(dur - 0.08, 2400, 0.8);
    setTimeout(() => ctx.close(), OPEN_MS + 600);
  } catch {}
}

export default function LensIntro() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [brushed, setBrushed] = useState("");
  const phaseRef = useRef<Phase>("loading");
  phaseRef.current = phase;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<SVGGElement>(null);
  const bladeRefs = useRef<(SVGGElement | null)[]>([]);
  const litRefs = useRef<(SVGPathElement | null)[]>([]);
  const glassRef = useRef<SVGGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const openedAt = useRef(0);
  const from = useRef({ r: 0, a: 0 });
  const zoom = useRef({ cover: 1, outer: 0 });

  useEffect(() => setBrushed(brushedTexture()), []);

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
    const outer = (stageRef.current?.getBoundingClientRect().width ?? 600) / 2;
    const hole = (outer * HOLE) / 100;
    zoom.current = { outer, cover: (Math.hypot(window.innerWidth, window.innerHeight) / 2 / hole) * 1.06 };
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

  // one loop drives the blades, the light on them, and the push through the lens
  useEffect(() => {
    if (phase === "done") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const openMs = reduced ? 500 : OPEN_MS;
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      const s = (now - t0) / 1000;
      const p = phaseRef.current;
      let r: number;
      let a: number;
      let glass = 1;
      let scale = 1;
      let fade = 1;
      if (p === "opening") {
        const k = clamp01((now - openedAt.current) / openMs);
        const kb = easeInOutCubic(clamp01(k / 0.55));
        r = from.current.r + (HOLE + 10 - from.current.r) * kb;
        a = from.current.a + (reduced ? 0 : 70) * kb;
        glass = 1 - kb;
        if (reduced) {
          fade = 1 - k;
        } else {
          const kz = clamp01((k - 0.38) / 0.62);
          scale = 1 + (zoom.current.cover - 1) * kz * kz * kz;
          fade = 1 - clamp01((k - 0.86) / 0.14);
        }
        if (k >= 1) {
          setPhase("done");
          return;
        }
      } else if (p === "ready") {
        r = 24 + 1.2 * Math.sin(s * 2.2);
        a = -8 + 3 * Math.sin(s * 0.9);
      } else {
        // focusing: the aperture hunts while it loads
        r = 4 + 3 * Math.abs(Math.sin(s * 1.7));
        a = -8 + 10 * Math.sin(s * 1.3);
      }
      if (p !== "opening") from.current = { r, a };

      rotorRef.current?.setAttribute("transform", `rotate(${a.toFixed(2)})`);
      for (let i = 0; i < BLADES; i++) {
        bladeRefs.current[i]?.setAttribute("transform", `translate(0 ${(-r).toFixed(2)})`);
        // the key light sits up and to the left: blades facing it catch more of it
        const facing = 0.5 + 0.5 * Math.cos(((a + (i * 360) / BLADES + 37) * Math.PI) / 180);
        litRefs.current[i]?.setAttribute("opacity", (0.015 + 0.11 * facing * facing).toFixed(3));
      }
      glassRef.current?.setAttribute("opacity", glass.toFixed(3));
      frontRef.current?.setAttribute("opacity", glass.toFixed(3));
      if (p === "opening" && stageRef.current && rootRef.current) {
        stageRef.current.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
        rootRef.current.style.setProperty("--hole", `${(zoom.current.outer * scale - 1).toFixed(1)}px`);
        rootRef.current.style.opacity = fade.toFixed(3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase === "done") return null;

  const opening = phase === "opening";
  const ready = phase === "ready";
  const bodyMask = "radial-gradient(circle at 50% 50%, transparent var(--hole), #000 calc(var(--hole) + 1.5px))";

  return (
    <div
      ref={rootRef}
      id="lens-intro"
      className="fixed inset-0 z-[100] select-none overflow-hidden"
      style={{ "--d": "min(86vmin, 640px)", "--hole": "calc(var(--d) / 2 - 1px)" } as CSSProperties}
      aria-label="Intro"
      onClick={ready ? enter : undefined}
    >
      <noscript>
        <style>{`#lens-intro{display:none!important}html{overflow:auto!important}`}</style>
      </noscript>

      {/* camera body: matte, grained, lit from the upper left; the barrel sits in its hole */}
      <div className="absolute inset-0" style={{ maskImage: bodyMask, WebkitMaskImage: bodyMask }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 22% 12%, rgba(255,255,255,.07), transparent 70%), radial-gradient(ellipse at 50% 50%, #141518 0%, #0b0c0e 55%, #050506 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.13] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      </div>

      <div
        ref={stageRef}
        className="absolute left-1/2 top-1/2 h-[var(--d)] w-[var(--d)] will-change-transform"
        style={{ transform: "translate(-50%, -50%)" }}
        aria-hidden
      >
        {/* the barrel's shadow on the body */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 38px 90px -8px rgba(0,0,0,.95), 0 12px 28px rgba(0,0,0,.7)" }}
        />

        {/* inside the barrel: the deep glass, the blades, the front element's reflections */}
        <svg className="absolute inset-0 h-full w-full" viewBox="-100 -100 200 200">
          <defs>
            <clipPath id="lens-hole">
              <circle r={HOLE + 0.5} />
            </clipPath>
            <radialGradient id="lens-deep" cx="45%" cy="42%" r="60%">
              <stop offset="0" stopColor="#123430" />
              <stop offset="0.4" stopColor="#061110" />
              <stop offset="1" stopColor="#010202" />
            </radialGradient>
            <radialGradient id="lens-glint">
              <stop offset="0" stopColor="#7dfde0" stopOpacity="0.45" />
              <stop offset="1" stopColor="#7dfde0" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lens-blade" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="120" y2="-50">
              <stop offset="0" stopColor="#1b1e23" />
              <stop offset="0.32" stopColor="#30343c" />
              <stop offset="0.55" stopColor="#15171b" />
              <stop offset="1" stopColor="#24272d" />
            </linearGradient>
            <linearGradient id="lens-chamfer" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-2">
              <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lens-edge" gradientUnits="userSpaceOnUse" x1="-40" y1="0" x2="100" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.05" />
              <stop offset="0.35" stopColor="#e6fffa" stopOpacity="0.6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="lens-skirt" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="5">
              <stop offset="0" stopColor="#000" stopOpacity="0.7" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            {brushed && (
              <pattern id="lens-brushed" patternUnits="userSpaceOnUse" width="64" height="64">
                <image href={brushed} width="64" height="64" preserveAspectRatio="none" />
              </pattern>
            )}
            <radialGradient id="lens-rim">
              <stop offset="0.74" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.75" />
            </radialGradient>
            <radialGradient id="lens-flare" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g clipPath="url(#lens-hole)">
            <g ref={glassRef}>
              <circle r={HOLE + 1} fill="url(#lens-deep)" />
              {[12, 21, 31, 42].map((r) => (
                <circle key={r} r={r} fill="none" stroke="#5eead4" strokeOpacity="0.07" strokeWidth="0.5" />
              ))}
              <ellipse cx="-7" cy="-9" rx="9" ry="5" transform="rotate(-30)" fill="url(#lens-glint)" />
              <circle cx="6" cy="8" r="1.1" fill="#c4b5fd" opacity="0.5" />
            </g>

            <g ref={rotorRef}>
              {Array.from({ length: BLADES }, (_, i) => (
                <g key={i} transform={`rotate(${(i * 360) / BLADES})`}>
                  <g
                    ref={(el) => {
                      bladeRefs.current[i] = el;
                    }}
                  >
                    <rect x="-60" y="0" width="220" height="5" fill="url(#lens-skirt)" />
                    <path d={BLADE} fill="url(#lens-blade)" />
                    {brushed && <path d={BLADE} fill="url(#lens-brushed)" opacity="0.55" />}
                    <path
                      ref={(el) => {
                        litRefs.current[i] = el;
                      }}
                      d={BLADE}
                      fill="#dff"
                      opacity="0.05"
                    />
                    <rect x="-40" y="-2" width="180" height="2" fill="url(#lens-chamfer)" />
                    <path d="M -40 -0.25 L 140 -0.25" stroke="url(#lens-edge)" strokeWidth="0.45" />
                    <path d="M -40 0 L -200 -160" stroke="#fff" strokeOpacity="0.07" strokeWidth="0.4" />
                  </g>
                </g>
              ))}
            </g>

            <circle r={HOLE + 0.5} fill="url(#lens-rim)" />

            {/* the front element sits in front of the blades: its coating and the room show in it */}
            <g ref={frontRef}>
              <ellipse cx="-20" cy="-24" rx="30" ry="16" transform="rotate(-38 -20 -24)" fill="url(#lens-flare)" />
              <path d="M -47 -18 A 51 51 0 0 1 -14 -49" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M -40 -12 A 42 42 0 0 1 -26 -32" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="0.6" strokeLinecap="round" />
              <path d="M 31 39 A 50 50 0 0 0 46 19" fill="none" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 17 47 A 51 51 0 0 0 33 38" fill="none" stroke="#34d399" strokeOpacity="0.22" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M 40 8 A 41 41 0 0 0 36 -18" fill="none" stroke="#fbbf24" strokeOpacity="0.1" strokeWidth="1" strokeLinecap="round" />
              <circle cx="-31" cy="-35" r="1.5" fill="#fff" opacity="0.75" />
              <circle cx="-26" cy="-38.5" r="0.6" fill="#fff" opacity="0.5" />
            </g>
          </g>
        </svg>

        {/* the barrel, turned metal, ring by ring from the inner lip out (over a solid back, so no seam lets the page through) */}
        <div className="absolute inset-0 rounded-full" style={{ ...ring(HOLE + 1, 100), background: "#08090a" }} />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            ...ring(HOLE, 60.5),
            background:
              "conic-gradient(from 200deg, #050506, #2c2e33 14%, #060607 36%, #1d1f23 64%, #050506 86%, #050506)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            ...ring(60.5, 79),
            background:
              "repeating-radial-gradient(circle at center, rgba(255,255,255,.06) 0 .6px, rgba(0,0,0,.07) .6px 1.6px), conic-gradient(from 210deg, #6a6f77, #cfd4dc 7%, #8b9199 17%, #5a5e65 31%, #b3b8c0 45%, #6c7178 58%, #d8dce2 72%, #787d85 86%, #6a6f77)",
          }}
        />
        <div className="absolute inset-0 rounded-full" style={{ ...ring(79, 81.2), background: "#060607" }} />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            ...ring(81.2, 93),
            background:
              "conic-gradient(from 195deg, rgba(255,255,255,0), rgba(255,255,255,.2) 6%, rgba(255,255,255,0) 17%, rgba(255,255,255,0) 50%, rgba(255,255,255,.09) 60%, rgba(255,255,255,0) 72%, rgba(255,255,255,0)), repeating-conic-gradient(from 0deg, #24272c 0deg 0.75deg, #0b0c0e 0.75deg 1.5deg)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            ...ring(93, 100),
            background:
              "repeating-radial-gradient(circle at center, rgba(255,255,255,.035) 0 .6px, rgba(0,0,0,.08) .6px 1.6px), conic-gradient(from 200deg, #1c1e22, #474b53 9%, #17191c 24%, #2d3036 44%, #101114 60%, #3a3d44 78%, #1c1e22)",
          }}
        />
        {/* one light for the whole barrel: bright up-left, falling off to the lower right */}
        <div
          className="absolute inset-0 rounded-full mix-blend-overlay"
          style={{
            ...ring(HOLE, 100),
            background:
              "radial-gradient(circle at 27% 20%, rgba(255,255,255,.55), rgba(255,255,255,0) 32%), linear-gradient(150deg, rgba(255,255,255,.25) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0) 58%, rgba(0,0,0,.55) 100%)",
          }}
        />

        {/* bevels between the rings, and the engraving */}
        <svg className="absolute inset-0 h-full w-full" viewBox="-100 -100 200 200">
          <defs>
            <linearGradient id="lens-up" gradientUnits="userSpaceOnUse" x1="-60" y1="-100" x2="60" y2="100">
              <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
              <stop offset="1" stopColor="#000" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="lens-down" gradientUnits="userSpaceOnUse" x1="-60" y1="-100" x2="60" y2="100">
              <stop offset="0" stopColor="#000" stopOpacity="0.8" />
              <stop offset="0.55" stopColor="#000" stopOpacity="0.2" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.45" />
            </linearGradient>
            {/* cut into the metal: the upper wall of each letter falls into shadow, the lower lip catches light */}
            <filter id="lens-engrave" x="-5%" y="-5%" width="110%" height="110%">
              <feOffset in="SourceAlpha" dy="0.55" result="sunk" />
              <feGaussianBlur in="sunk" stdDeviation="0.18" result="sunkBlur" />
              <feComposite in="SourceAlpha" in2="sunkBlur" operator="out" result="wall" />
              <feFlood floodColor="#000" floodOpacity="0.9" />
              <feComposite in2="wall" operator="in" result="shadow" />
              <feOffset in="SourceAlpha" dy="0.4" result="lip" />
              <feComposite in="lip" in2="SourceAlpha" operator="out" result="lipOnly" />
              <feFlood floodColor="#fff" floodOpacity="0.7" />
              <feComposite in2="lipOnly" operator="in" result="light" />
              <feMerge>
                <feMergeNode in="light" />
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="shadow" />
              </feMerge>
            </filter>
            <path id="lens-name" d={`M 0 ${-NAME_R} A ${NAME_R} ${NAME_R} 0 1 1 -0.01 ${-NAME_R}`} />
            <path id="lens-stops" d="M -73.23 -61.45 A 95.6 95.6 0 0 1 73.23 -61.45" />
            <radialGradient id="lens-dot" cx="38%" cy="32%" r="70%">
              <stop offset="0" stopColor="#ff8a80" />
              <stop offset="0.45" stopColor="#e5251b" />
              <stop offset="1" stopColor="#7a0c07" />
            </radialGradient>
          </defs>

          <circle r="99.6" fill="none" stroke="url(#lens-up)" strokeWidth="0.8" />
          <circle r="93.1" fill="none" stroke="url(#lens-down)" strokeWidth="0.6" />
          <circle r="81.3" fill="none" stroke="url(#lens-up)" strokeWidth="0.5" />
          <circle r="78.9" fill="none" stroke="url(#lens-down)" strokeWidth="0.6" />
          <circle r="60.6" fill="none" stroke="url(#lens-up)" strokeWidth="0.6" />
          <circle r={HOLE + 0.4} fill="none" stroke="url(#lens-down)" strokeWidth="1" />

          <text
            fontSize="5.6"
            fontWeight="600"
            fill="#3a3e45"
            filter="url(#lens-engrave)"
            style={{ fontFamily: "'Inter Variable', 'Helvetica Neue', Arial, sans-serif" }}
          >
            <textPath href="#lens-name" textLength={2 * Math.PI * NAME_R * 0.985} lengthAdjust="spacing">
              {NAME}
            </textPath>
          </text>

          <text
            fontSize="4"
            fontWeight="600"
            fill="#e4e6ea"
            textAnchor="middle"
            filter="url(#lens-engrave)"
            xmlSpace="preserve"
            style={{ fontFamily: "'Inter Variable', 'Helvetica Neue', Arial, sans-serif" }}
          >
            <textPath href="#lens-stops" startOffset="50%">
              {"16     11     8     5.6     4     2.8     2     1.4"}
            </textPath>
          </text>

          <circle cy="-87.1" r="2.1" fill="#0a0a0b" />
          <circle cy="-87.1" r="1.6" fill="url(#lens-dot)" />
          <circle cx="-0.5" cy="-87.7" r="0.45" fill="#fff" opacity="0.8" />
        </svg>
      </div>

      {/* readout and the shutter button, at the center of the aperture */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          opening ? "opacity-0" : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            enter();
          }}
          disabled={!ready}
          autoFocus
          style={{ width: "max(116px, calc(var(--d) * 0.25))", height: "max(116px, calc(var(--d) * 0.25))" }}
          className={`pointer-events-auto relative flex flex-col items-center justify-center rounded-full border text-center transition-[border-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
            ready
              ? "cursor-pointer border-accent/45 shadow-[0_0_34px_-6px_rgba(0,255,204,.7),inset_0_0_22px_rgba(0,255,204,.14)] hover:scale-105"
              : "cursor-wait border-transparent"
          }`}
        >
          {ready ? (
            <>
              <span className="mono text-[10px] uppercase tracking-[0.3em] text-accent [text-shadow:0_0_8px_rgba(0,255,204,.6)]">
                ● rec
              </span>
              <span className="mt-1 text-sm font-medium text-titanium [text-shadow:0_1px_2px_rgba(0,0,0,.9)]">
                {t.intro.enter}
              </span>
            </>
          ) : (
            <>
              <span className="mono text-[10px] uppercase tracking-[0.25em] text-zinc-300 [text-shadow:0_1px_2px_#000,0_0_6px_#000]">
                {t.intro.loading}
              </span>
              <span className="mono mt-1 text-lg tabular-nums text-titanium [text-shadow:0_1px_2px_#000,0_0_8px_#000]">
                {progress}%
              </span>
            </>
          )}
        </button>

        {/* stamped into the body */}
        <div
          className={`mono absolute bottom-[7vh] text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2b2d32] transition-opacity duration-500 [text-shadow:0_1px_0_rgba(255,255,255,.13),0_-1px_0_rgba(0,0,0,.95)] ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          {t.intro.hint}
        </div>
      </div>
    </div>
  );
}
