import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { LocaleProvider } from "@/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "Zetian Yu // Full-stack & AI",
  description:
    "Tokyo-based Full-stack / AI Application Engineer. Experience at Meituan and selected projects: EasyWyckoff, 食读 and Lunaria.",
  metadataBase: new URL("https://timeblind.xyz"),
  openGraph: {
    title: "Zetian Yu // Full-stack & AI",
    description:
      "Zetian Yu — Full-stack / AI Application Engineer. Explore EasyWyckoff, 食读 and Lunaria.",
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
