import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { LocaleProvider } from "@/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "timeblind // cyber resume",
  description:
    "A Modern Cyber-Geek personal profile. Tech stack, experience timeline, live concerts and travel footprints.",
  metadataBase: new URL("https://timeblind.dev"),
  openGraph: {
    title: "timeblind // cyber resume",
    description:
      "A Modern Cyber-Geek personal profile built with Next.js, Three.js and a lot of caffeine.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
