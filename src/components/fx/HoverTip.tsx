"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const TIP_CLASS =
  "pointer-events-none w-max max-w-[min(300px,85vw)] whitespace-pre-wrap rounded-lg border border-white/12 bg-black/92 px-2.5 py-1.5 text-[11px] leading-snug text-titanium shadow-[0_8px_28px_rgba(0,0,0,0.65)] backdrop-blur-sm";

export default function HoverTip({
  tip,
  children,
  className = "",
  place = "top",
  portal = false,
}: {
  tip: string;
  children: ReactNode;
  className?: string;
  place?: "top" | "bottom";
  portal?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const updateCoords = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      x: Math.min(r.left, window.innerWidth - 304),
      y: place === "bottom" ? r.bottom + 6 : r.top - 6,
    });
  }, [place]);

  if (!tip.trim()) {
    return <span className={className}>{children}</span>;
  }

  if (portal) {
    return (
      <>
        <span
          ref={ref}
          className={`inline-block max-w-full ${className}`}
          onMouseEnter={() => {
            updateCoords();
            setShow(true);
          }}
          onMouseLeave={() => setShow(false)}
        >
          {children}
        </span>
        {show &&
          typeof document !== "undefined" &&
          createPortal(
            <span
              role="tooltip"
              className={`fixed z-[200] ${TIP_CLASS}`}
              style={{
                left: coords.x,
                top: coords.y,
                transform: place === "top" ? "translateY(-100%)" : undefined,
              }}
            >
              {tip}
            </span>,
            document.body,
          )}
      </>
    );
  }

  const pos =
    place === "bottom"
      ? "top-full left-0 mt-1.5"
      : "bottom-full left-0 mb-1.5";

  return (
    <span className={`group/tip relative inline-block max-w-full ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`absolute ${pos} z-40 hidden ${TIP_CLASS} group-hover/tip:block`}
      >
        {tip}
      </span>
    </span>
  );
}
