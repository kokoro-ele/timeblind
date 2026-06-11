"use client";

import { useRef } from "react";
import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useLocale } from "@/i18n/LocaleProvider";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";

export default function LanguageSwitcher({
  mouseX,
}: {
  mouseX: MotionValue<number>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { locale, setLocale, t } = useLocale();

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const sizeRaw = useTransform(distance, [-130, 0, 130], [40, 64, 40]);
  const size = useSpring(sizeRaw, { mass: 0.1, stiffness: 170, damping: 14 });

  const cycle = () => {
    const i = LOCALES.indexOf(locale);
    setLocale(LOCALES[(i + 1) % LOCALES.length]);
  };

  return (
    <motion.button
      ref={ref}
      onClick={cycle}
      style={{ width: size, height: size }}
      className="group relative flex aspect-square items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-titanium/70 transition-colors hover:border-accent/40 hover:text-accent"
      aria-label={`${t.lang.label}: ${LOCALE_LABELS[locale].native}`}
    >
      <span className="mono text-[11px] font-semibold tracking-tight">
        {LOCALE_LABELS[locale].code}
      </span>
      <span className="pointer-events-none absolute -top-9 left-1/2 flex -translate-x-1/2 gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {LOCALES.map((l) => (
          <span
            key={l}
            className={l === locale ? "text-accent" : "text-muted"}
          >
            {LOCALE_LABELS[l].native}
          </span>
        ))}
      </span>
    </motion.button>
  );
}
