"use client";

import { BentoGrid, BentoCard } from "@/components/BentoGrid";
import MeshGrid from "@/components/fx/MeshGrid";
import CommandPalette from "@/components/nav/CommandPalette";
import FloatingDock from "@/components/nav/FloatingDock";
import TechStackDashboard from "@/components/bento/TechStackDashboard";
import ExperienceTimeline from "@/components/bento/ExperienceTimeline";
import TicketWallet from "@/components/bento/TicketWallet";
import TravelGlobe from "@/components/bento/TravelGlobe";
import SystemState from "@/components/bento/SystemState";
import { profile } from "@/lib/data";
import { useLocale } from "@/i18n/LocaleProvider";
import { loc } from "@/i18n/config";
import { fmt } from "@/i18n/messages";

export default function Home() {
  const { locale, t } = useLocale();

  return (
    <>
      <MeshGrid />
      <CommandPalette />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-24 sm:px-6">
        {/* hero */}
        <header className="mb-8 px-1">
          <div className="mono mb-2 text-[11px] uppercase tracking-[0.3em] text-accent">
            {profile.handle} // {loc(profile.role, locale)}
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-titanium sm:text-4xl">
            {profile.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-titanium/60">
            {loc(profile.tagline, locale)}
          </p>
        </header>

        <BentoGrid>
          <BentoCard
            id="tech"
            title={t.cards.tech}
            tag="01 // htop"
            className="sm:col-span-2 lg:col-span-4"
          >
            <TechStackDashboard />
          </BentoCard>

          <BentoCard
            id="status"
            title={t.cards.status}
            tag="05 // now"
            className="sm:col-span-2 lg:col-span-2"
          >
            <SystemState />
          </BentoCard>

          <BentoCard
            id="timeline"
            title={t.cards.timeline}
            tag="02 // graph"
            className="sm:col-span-2 lg:col-span-3"
          >
            <ExperienceTimeline />
          </BentoCard>

          <BentoCard
            id="concerts"
            title={t.cards.concerts}
            tag="03 // tickets"
            accent="#a855f7"
            className="sm:col-span-2 lg:col-span-3"
          >
            <TicketWallet />
          </BentoCard>

          <BentoCard
            id="travel"
            title={t.cards.travel}
            tag="04 // globe"
            className="sm:col-span-2 lg:col-span-6"
            bleed
          >
            <TravelGlobe />
          </BentoCard>
        </BentoGrid>

        <footer className="mono mt-8 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-muted">
          <span>{fmt(t.footer.built, { year: new Date().getFullYear() })}</span>
          <span>{t.footer.dataDriven}</span>
        </footer>
      </main>

      <FloatingDock />
    </>
  );
}
