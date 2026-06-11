"use client";

import { useEffect, useRef } from "react";

type CreatureKind = "ascii" | "emoji";

interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: CreatureKind;
  lines: string[];
  emoji?: string;
  color: string;
  phase: number;
  /** autonomous wander target */
  tx: number;
  ty: number;
  wanderTimer: number;
  speed: number;
  hopRate: number;
}

interface Flower {
  x: number;
  y: number;
  lines: string[];
  color: string;
  phase: number;
}

const isCatAscii = (lines: string[]) =>
  /[ω･ฅ]/.test(lines.join("")) || /='\.'.=/.test(lines.join(""));

const ASCII_CREATURES: { lines: string[]; color: string; speed?: number }[] = [
  { lines: ["(\\__/)", "(='.'=)", '(")_(")'], color: "#d4d4d8", speed: 1.1 },
  { lines: ["(=^･ω･^=)"], color: "#38bdf8", speed: 0.85 },
  { lines: ["(=｀ω´=)"], color: "#00ffcc", speed: 1.0 },
  { lines: ["(=①ω①=)"], color: "#7dd3fc", speed: 0.75 },
  { lines: ["ฅ^•ﻌ•^ฅ"], color: "#a5f3fc", speed: 0.9 },
  { lines: ["(=ↀωↀ=)"], color: "#67e8f9", speed: 0.8 },
  { lines: [" /\\_/\\ ", "( o.o )", " > ^ < "], color: "#bae6fd", speed: 0.95 },
  { lines: ["ʕ•ᴥ•ʔ"], color: "#fbbf24", speed: 1.0 },
  { lines: ["(◕‿◕)ノ"], color: "#00ffcc", speed: 1.2 },
  { lines: ["(>ω<)ゞ"], color: "#f472b6", speed: 1.15 },
  { lines: ["⊂(◉‿◉)つ"], color: "#a78bfa", speed: 0.95 },
];

const CAT_EMOJI_RE = /🐱|🐈|😺|😸|😻|🙀|🐈‍⬛/;

const EMOJI_CREATURES: { emoji: string; speed?: number }[] = [
  { emoji: "🐱", speed: 0.9 },
  { emoji: "🐈", speed: 0.85 },
  { emoji: "🐈‍⬛", speed: 0.8 },
  { emoji: "😺", speed: 1.0 },
  { emoji: "😸", speed: 1.05 },
  { emoji: "😻", speed: 0.75 },
  { emoji: "🙀", speed: 1.15 },
  { emoji: "🐰", speed: 1.2 },
  { emoji: "🐻", speed: 0.8 },
  { emoji: "🦊", speed: 1.1 },
  { emoji: "🐸", speed: 0.95 },
  { emoji: "🐛", speed: 0.7 },
  { emoji: "🦋", speed: 1.3 },
  { emoji: "🐾", speed: 1.0 },
];

const FLOWERS: { lines: string[]; color: string }[] = [
  { lines: [" @ ", " | ", " ' "], color: "#f472b6" },
  { lines: ["(\\|/)", " \\|/ ", "  |  "], color: "#fbbf24" },
  { lines: [" * ", "/|\\", " | "], color: "#00ffcc" },
  { lines: ["(o)", " | ", " ~ "], color: "#e879f9" },
  { lines: [" 🌸 ", "  |  "], color: "#fda4af" },
];

const GRASS_CHARS = ["'", ",", ".", "`", "·", "🌿"];

const CREATURE_COUNT = { ascii: 3, emoji: 2 } as const;
const SPEED_SCALE = 0.42;

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function pickWanderTarget(width: number, groundY: number, pad: number) {
  return {
    tx: pad + Math.random() * (width - pad * 2),
    ty: groundY - 14 - Math.random() * 36,
  };
}

export default function AsciiGarden({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement!;
    let width = 0;
    let height = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const fontSize = 11;
    const emojiSize = 16;
    const lineH = fontSize + 2;

    let creatures: Creature[] = [];
    let flowers: Flower[] = [];
    let grass: { x: number; ch: string }[] = [];

    const toCreature = (
      p: {
        kind: CreatureKind;
        lines: string[];
        emoji?: string;
        color: string;
        speed?: number;
        hopRate?: number;
      },
    ): Omit<Creature, "x" | "y" | "vx" | "vy" | "tx" | "ty" | "wanderTimer" | "phase"> => ({
      kind: p.kind,
      lines: p.lines,
      emoji: p.emoji,
      color: p.color,
      speed: (p.speed ?? 1) * SPEED_SCALE,
      hopRate: p.hopRate ?? 2.5 + Math.random(),
    });

    const spawnCreatures = (groundY: number, pad: number) => {
      const catAscii = ASCII_CREATURES.filter((c) => isCatAscii(c.lines));
      const catEmoji = EMOJI_CREATURES.filter((e) => CAT_EMOJI_RE.test(e.emoji));
      const otherEmoji = EMOJI_CREATURES.filter((e) => !CAT_EMOJI_RE.test(e.emoji));

      const asciiPicks = pickN(
        catAscii.length >= CREATURE_COUNT.ascii ? catAscii : ASCII_CREATURES,
        CREATURE_COUNT.ascii,
      );
      const emojiPicks = [
        ...pickN(catEmoji, 1),
        ...pickN(otherEmoji.length ? otherEmoji : catEmoji, 1),
      ].slice(0, CREATURE_COUNT.emoji);

      const pool = [
        ...asciiPicks.map((c) =>
          toCreature({ kind: "ascii", lines: c.lines, color: c.color, speed: c.speed }),
        ),
        ...emojiPicks.map((e) =>
          toCreature({
            kind: "emoji",
            lines: [],
            emoji: e.emoji,
            color: "#fff",
            speed: e.speed,
          }),
        ),
      ];

      return pool.map((p, i) => {
        const w = pickWanderTarget(width, groundY, pad);
        const startX = pad + (i / Math.max(1, pool.length - 1)) * (width - pad * 2);
        return {
          ...p,
          x: startX + (Math.random() - 0.5) * 30,
          y: groundY - 20 - Math.random() * 25,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.15,
          tx: w.tx,
          ty: w.ty,
          wanderTimer: 2 + Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const layout = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const groundY = height - 18;
      const pad = 20;

      grass = [];
      for (let x = 0; x < width; x += fontSize * 0.55) {
        const useEmoji = Math.random() < 0.06;
        grass.push({
          x,
          ch: useEmoji
            ? ["🌿", "🍀"][Math.floor(Math.random() * 2)]
            : GRASS_CHARS[Math.floor(Math.random() * (GRASS_CHARS.length - 1))],
        });
      }

      flowers = FLOWERS.map((f, i) => ({
        x: (width / (FLOWERS.length + 1)) * (i + 1) + (Math.random() - 0.5) * 16,
        y: groundY - f.lines.length * lineH - 4,
        lines: f.lines,
        color: f.color,
        phase: Math.random() * Math.PI * 2,
      }));

      creatures = spawnCreatures(groundY, pad);
    };

    const drawAscii = (
      lines: string[],
      cx: number,
      cy: number,
      color: string,
      alpha = 1,
    ) => {
      ctx.font = `${fontSize}px var(--font-mono), monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      const blockH = lines.length * lineH;
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, cy - blockH / 2 + i * lineH);
      });
      ctx.globalAlpha = 1;
    };

    const drawEmoji = (emoji: string, cx: number, cy: number, alpha = 1) => {
      ctx.font = `${emojiSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = alpha;
      ctx.fillText(emoji, cx, cy);
      ctx.globalAlpha = 1;
    };

    const tick = (time: number) => {
      const t = time * 0.001;
      const dt = 1 / 60;
      const groundY = height - 18;
      const pad = 20;
      const { x: px, y: py, active } = pointer.current;

      ctx.clearRect(0, 0, width, height);
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#0a1210");
      sky.addColorStop(0.6, "#09110f");
      sky.addColorStop(1, "#071a12");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.35;
      ctx.font = `${fontSize}px var(--font-mono), monospace`;
      for (let i = 0; i < 8; i++) {
        const fx = (i * 97 + 13) % width;
        const fy = 12 + ((i * 53) % (groundY - 30));
        ctx.fillStyle = i % 2 ? "#00ffcc" : "#fbbf24";
        ctx.globalAlpha = (0.3 + 0.7 * Math.sin(t * 2 + i)) * 0.35;
        ctx.fillText("·", fx, fy);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#0f2a1a88";
      ctx.fillRect(0, groundY - 4, width, height - groundY + 4);

      ctx.font = `${fontSize}px var(--font-mono), monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      grass.forEach((g, i) => {
        const sway = Math.sin(t * 1.5 + i * 0.3) * 1.5;
        const isEmoji = g.ch.length > 1;
        if (isEmoji) {
          ctx.font = `12px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.fillText(g.ch, g.x + sway, groundY - 2);
        } else {
          ctx.font = `${fontSize}px var(--font-mono), monospace`;
          ctx.fillStyle = `rgba(34,197,94,${0.25 + (i % 3) * 0.08})`;
          ctx.fillText(g.ch, g.x + sway, groundY + (i % 2));
        }
      });

      flowers.forEach((f) => {
        let sway = Math.sin(t * 1.2 + f.phase) * 3;
        if (active) {
          const dx = f.x - px;
          const dy = f.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 80) sway += (dx / dist) * 6;
        }
        drawAscii(f.lines, f.x + sway, f.y, f.color, 0.9);
      });

      creatures.forEach((c) => {
        // --- autonomous wander ---
        c.wanderTimer -= dt;
        if (c.wanderTimer <= 0) {
          const w = pickWanderTarget(width, groundY, pad);
          c.tx = w.tx;
          c.ty = w.ty;
          c.wanderTimer = 3 + Math.random() * 4;
        }

        const dxT = c.tx - c.x;
        const dyT = c.ty - c.y;
        const distT = Math.sqrt(dxT * dxT + dyT * dyT) || 1;
        const wanderForce = c.speed * 0.055;
        c.vx += (dxT / distT) * wanderForce;
        c.vy += (dyT / distT) * wanderForce * 0.4;

        c.vx += (Math.random() - 0.5) * 0.05 * c.speed;
        c.vy += (Math.random() - 0.5) * 0.025;

        if (Math.random() < 0.002 * c.speed) {
          c.vx += (Math.random() - 0.5) * 0.8;
          c.vy -= Math.random() * 0.4;
        }

        // mouse flee (additive, doesn't stop wander)
        if (active) {
          const dx = c.x - px;
          const dy = c.y - py;
          const dist2 = dx * dx + dy * dy;
          const fleeR = 72;
          if (dist2 < fleeR * fleeR && dist2 > 1) {
            const dist = Math.sqrt(dist2);
            const force = (1 - dist / fleeR) * 1.6;
            c.vx += (dx / dist) * force;
            c.vy += (dy / dist) * force * 0.55;
            c.wanderTimer = 0.3; // re-pick target after scare
          }
        }

        const floor =
          groundY -
          (c.kind === "emoji" ? emojiSize : c.lines.length * lineH) -
          4;
        c.vy += (floor - 10 - c.y) * 0.004;

        const maxV = 1.1 * c.speed;
        c.vx = Math.max(-maxV, Math.min(maxV, c.vx));
        c.vy = Math.max(-maxV * 0.6, Math.min(maxV * 0.4, c.vy));

        c.vx *= 0.992;
        c.vy *= 0.985;
        c.x += c.vx;
        c.y += c.vy;

        if (c.x < pad) {
          c.x = pad;
          c.vx = Math.abs(c.vx) * 0.8 + 0.6;
          c.tx = pad + 40 + Math.random() * 60;
        }
        if (c.x > width - pad) {
          c.x = width - pad;
          c.vx = -Math.abs(c.vx) * 0.8 - 0.6;
          c.tx = width - pad - 40 - Math.random() * 60;
        }
        if (c.y < 14) {
          c.y = 14;
          c.vy = Math.abs(c.vy) + 0.3;
        }
        if (c.y > floor) {
          c.y = floor;
          c.vy *= -0.45;
        }

        const moving = Math.abs(c.vx) > 0.06;
        const hop =
          Math.abs(Math.sin(t * c.hopRate + c.phase)) *
          (moving ? 2 : 0.5);
        const faceFlip = c.vx < -0.08 ? -1 : 1;

        ctx.save();
        ctx.translate(c.x, c.y - hop);
        ctx.scale(faceFlip, 1);
        if (c.kind === "emoji" && c.emoji) {
          drawEmoji(c.emoji, 0, 0, 0.95);
        } else {
          drawAscii(c.lines, 0, 0, c.color, 0.95);
        }
        ctx.restore();
      });

      if (active) {
        const g = ctx.createRadialGradient(px, py, 0, px, py, 50);
        g.addColorStop(0, "rgba(0,255,204,0.12)");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(px - 50, py - 50, 100, 100);
      }

      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = e.clientX - rect.left;
      pointer.current.y = e.clientY - rect.top;
      pointer.current.active = true;
    };
    const onLeave = () => {
      pointer.current.active = false;
      pointer.current.x = -9999;
      pointer.current.y = -9999;
    };

    layout();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(layout);
    ro.observe(parent);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full touch-none ${className}`}
      aria-label="ASCII garden"
    />
  );
}
