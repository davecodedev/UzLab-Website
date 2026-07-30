import type { Metadata } from "next";
import { PublicChrome } from "@/components/PublicChrome";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "UzLab",
  description: "Ассоциация лабораторий Узбекистана — национальная инфраструктура качества.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <PublicChrome>{children}</PublicChrome>
        </LangProvider>
      </body>
    </html>
  );
}
