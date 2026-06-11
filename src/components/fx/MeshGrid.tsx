"use client";

import { useEffect, useRef } from "react";

/**
 * Full-viewport ambient layer:
 *  - a faint geometric mesh grid (24px)
 *  - a soft radial glow that ray-traces the cursor position
 * Rendered fixed behind everything; pointer-events disabled.
 */
export default function MeshGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const target = useRef({ x: 0.5, y: 0.4 });
  const current = useRef({ x: 0.5, y: 0.4 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX / window.innerWidth;
      target.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      // critically damped follow for a smooth "tracing" feel
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      const el = rootRef.current;
      if (el) {
        el.style.setProperty("--gx", `${(current.current.x * 100).toFixed(2)}%`);
        el.style.setProperty("--gy", `${(current.current.y * 100).toFixed(2)}%`);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-base"
      style={
        {
          "--gx": "50%",
          "--gy": "40%",
        } as React.CSSProperties
      }
    >
      {/* base vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,#10231f_0%,transparent_55%)]" />

      {/* mesh grid */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "var(--grid-size) var(--grid-size)",
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      {/* cursor ray-trace glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(420px circle at var(--gx) var(--gy), rgba(0,255,204,0.10), transparent 60%)",
        }}
      />

      {/* highlighted grid lines that brighten near the cursor */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,255,204,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,255,204,0.18) 1px, transparent 1px)",
          backgroundSize: "var(--grid-size) var(--grid-size)",
          maskImage:
            "radial-gradient(260px circle at var(--gx) var(--gy), #000 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(260px circle at var(--gx) var(--gy), #000 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
