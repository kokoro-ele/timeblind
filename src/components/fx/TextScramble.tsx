"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "!<>-_\\/[]{}—=+*^?#01100110ABCDEF";

/**
 * Decodes `text` with a character-scramble animation whenever it changes.
 * Each character locks into place at a staggered time; until then it flickers
 * through random glyphs.
 */
export default function TextScramble({
  text,
  className = "",
  speed = 1,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  speed?: number;
  as?: "span" | "div" | "p";
}) {
  const [display, setDisplay] = useState(text);
  const raf = useRef<number>(0);
  const frame = useRef(0);

  useEffect(() => {
    const from = display;
    const to = text;
    const length = Math.max(from.length, to.length);
    const queue: { from: string; to: string; start: number; end: number }[] =
      [];
    for (let i = 0; i < length; i++) {
      const start = Math.floor(Math.random() * 16 * speed);
      const end = start + Math.floor(Math.random() * 24 * speed) + 6;
      queue.push({
        from: from[i] || "",
        to: to[i] || "",
        start,
        end,
      });
    }
    frame.current = 0;
    cancelAnimationFrame(raf.current);

    const update = () => {
      let output = "";
      let complete = 0;
      for (const q of queue) {
        if (frame.current >= q.end) {
          complete++;
          output += q.to;
        } else if (frame.current >= q.start) {
          output += `<span style="color:#00ffcc">${
            CHARS[Math.floor(Math.random() * CHARS.length)]
          }</span>`;
        } else {
          output += q.from;
        }
      }
      setDisplay(output);
      if (complete < queue.length) {
        frame.current++;
        raf.current = requestAnimationFrame(update);
      }
    };
    raf.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: display }}
    />
  );
}
