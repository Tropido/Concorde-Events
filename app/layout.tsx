import type { Metadata, Viewport } from "next";
// Self-hosted font files (bundled at build time, no third-party request at runtime).
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import { AppProvider } from "@/lib/context/app-context";
import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { getViewer } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";
import { THEME_SCRIPT } from "@/lib/prefs";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getPrefs();
  const m = translations[lang].meta;
  return {
    title: { default: m.title, template: `%s · ${BRAND_NAME}` },
    description: m.description,
    openGraph: { title: BRAND_NAME, siteName: BRAND_NAME, description: m.description, locale: lang === "ar" ? "ar_TN" : "fr_TN" },
  };
}

export const viewport: Viewport = {
  // Browser chrome colours: the light and dark paper tokens (meta tags can't read CSS variables).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#18110c" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const prefs = await getPrefs();
  // Signed-out rendering when Supabase is unreachable or unconfigured; pages that need
  // data render the explicit "service unavailable" state through app/error.tsx.
  const viewer = await getViewer().catch(() => null);

  return (
    // "dark" is set here when the cookie says so; for "system" THEME_SCRIPT sets it before
    // paint, hence suppressHydrationWarning on <html> only.
    <html lang={prefs.lang} dir={prefs.dir} data-theme={prefs.theme} className={prefs.theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] btn-ink btn-sm">
          {translations[prefs.lang].common.skipToContent}
        </a>
        <AppProvider prefs={prefs} viewer={viewer}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
