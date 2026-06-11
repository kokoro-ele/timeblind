"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { NAV_ITEMS, focusSection } from "@/lib/nav";
import { profile } from "@/lib/data";
import { useT } from "@/i18n/LocaleProvider";
import { Icon } from "./Icons";
import type { IconName } from "@/lib/nav";
import LanguageSwitcher from "./LanguageSwitcher";

export default function FloatingDock() {
  const mouseX = useMotionValue(Infinity);
  const t = useT();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <motion.div
        onPointerMove={(e) => mouseX.set(e.clientX)}
        onPointerLeave={() => mouseX.set(Infinity)}
        className="glass pointer-events-auto flex items-end gap-2 rounded-2xl px-3 py-2.5"
      >
        {NAV_ITEMS.map((item) => (
          <DockIcon
            key={item.id}
            mouseX={mouseX}
            icon={item.icon}
            label={t.nav[item.id]}
            onClick={() => focusSection(item.id)}
          />
        ))}

        <span className="mx-1 h-8 w-px self-center bg-white/10" />

        <DockIcon
          mouseX={mouseX}
          icon="github"
          label={t.nav.github}
          onClick={() => window.open(profile.github, "_blank", "noopener")}
        />

        <LanguageSwitcher mouseX={mouseX} />
      </motion.div>
    </div>
  );
}

export function DockIcon({
  mouseX,
  icon,
  label,
  onClick,
}: {
  mouseX: MotionValue<number>;
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0,
    };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeRaw = useTransform(distance, [-130, 0, 130], [40, 64, 40]);
  const size = useSpring(sizeRaw, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      style={{ width: size, height: size }}
      className="group relative flex aspect-square items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-titanium/70 transition-colors hover:border-accent/40 hover:text-accent"
      aria-label={label}
    >
      <Icon name={icon} className="h-[45%] w-[45%]" />
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] font-medium text-titanium opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </motion.button>
  );
}
