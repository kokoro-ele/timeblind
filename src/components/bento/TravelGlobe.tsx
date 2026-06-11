"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { travel } from "@/lib/data";
import { haversineKm } from "@/lib/geo";
import TextScramble from "@/components/fx/TextScramble";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";
import { fmt } from "@/i18n/messages";
import type { Place } from "@/types";

const Globe = dynamic(() => import("@/components/fx/Globe"), {
  ssr: false,
  loading: () => (
    <div className="mono flex h-full items-center justify-center text-xs text-muted">
      <span className="caret">...</span>
    </div>
  ),
});

export default function TravelGlobe() {
  const { locale, t } = useLocale();
  const [sel, setSel] = useState<Place | null>(null);
  const [mapPaused, setMapPaused] = useState(false);

  const totalKm = travel.places.reduce(
    (sum, p) => sum + haversineKm(travel.home.lat, travel.home.lng, p.lat, p.lng),
    0,
  );

  return (
    <div
      className="relative h-full min-h-[360px] overflow-hidden rounded-xl border border-white/8 bg-black/30"
      onMouseEnter={() => setMapPaused(true)}
      onMouseLeave={() => setMapPaused(false)}
    >
      <Globe onSelect={setSel} locale={locale} mapPaused={mapPaused} />

      {/* HUD: top-left stats */}
      <div className="mono pointer-events-none absolute left-3 top-3 text-[10px] leading-relaxed text-muted">
        <div>
          <span className="text-accent">{t.travel.nodes}:</span>{" "}
          {travel.places.length}
        </div>
        <div>
          <span className="text-accent">{t.travel.orbitKm}:</span>{" "}
          {totalKm.toLocaleString()}
        </div>
        <div>
          <span className="text-accent">{t.travel.home}:</span>{" "}
          {travel.home.name}
        </div>
      </div>

      {/* HUD: decoded note on hover */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3">
        <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur">
          {sel ? (
            <>
              <div className="mono text-[10px] text-accent">
                {fmt(t.travel.ping, { name: sel.name.toLowerCase() })} ::{" "}
                {sel.date}
              </div>
              <TextScramble
                key={`${sel.id}-${locale}`}
                text={loc(sel.note, locale)}
                as="p"
                speed={0.6}
                className="mono mt-1 block text-[10px] text-titanium/75"
              />
            </>
          ) : (
            <div className="mono text-[10px] text-muted">
              {t.travel.decodeHint}
              <span className="caret" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
