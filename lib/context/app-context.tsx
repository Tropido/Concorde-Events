"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { CatalogueProduct, Country, Currency, DraftLine, Viewer } from "@/lib/types";
import { currencyOf, setPrefCookie, type Prefs } from "@/lib/prefs";
import { translations, type Language, type Translations } from "@/lib/i18n/translations";

// UI state only. Server data (catalogue, requests, users…) is fetched by server components
// through Supabase + RLS and passed down as props.
interface AppContextType {
  viewer: Viewer | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  country: Country;
  setCountry: (c: Country) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;

  draft: DraftLine[];
  addToDraft: (line: Omit<DraftLine, "id">) => void;
  updateDraftQuantity: (id: string, quantity: number) => void;
  removeFromDraft: (id: string) => void;
  clearDraft: () => void;

  /** Event dates the visitor chose once (e.g. on the homepage); defaults for new lines. */
  eventDates: { start: string; end: string };
  setEventDates: (d: { start: string; end: string }) => void;

  previewProduct: CatalogueProduct | null;
  setPreviewProduct: (p: CatalogueProduct | null) => void;
  bookingProduct: CatalogueProduct | null;
  setBookingProduct: (p: CatalogueProduct | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const draftKey = (c: Country) => `concorde:draft:v2:${c}`;

function readDraft(c: Country): DraftLine[] {
  try {
    const raw = localStorage.getItem(draftKey(c));
    return raw ? (JSON.parse(raw) as DraftLine[]) : [];
  } catch {
    return [];
  }
}

export function AppProvider({
  children,
  prefs,
  viewer,
}: {
  children: React.ReactNode;
  prefs: Prefs;
  viewer: Viewer | null;
}) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(prefs.lang);
  const [country, setCountryState] = useState<Country>(prefs.country);
  const [currency, setCurrencyState] = useState<Currency>(prefs.currency);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [eventDates, setEventDates] = useState({ start: "", end: "" });
  const [previewProduct, setPreviewProduct] = useState<CatalogueProduct | null>(null);
  const [bookingProduct, setBookingProduct] = useState<CatalogueProduct | null>(null);

  // Server-rendered prefs win after a refresh.
  useEffect(() => {
    setLanguageState(prefs.lang);
    setCountryState(prefs.country);
    setCurrencyState(prefs.currency);
  }, [prefs.lang, prefs.country, prefs.currency]);

  // Drafts are per stock country: a French request cannot draw on Tunisian stock.
  useEffect(() => setDraft(readDraft(country)), [country]);

  const persist = useCallback(
    (next: DraftLine[]) => {
      setDraft(next);
      try {
        localStorage.setItem(draftKey(country), JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode): the draft still works for this page view.
      }
    },
    [country],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const value = useMemo<AppContextType>(() => {
    const setLanguage = (lang: Language) => {
      setLanguageState(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      setPrefCookie("lang", lang);
      router.refresh();
    };
    const setCountry = (c: Country) => {
      setCountryState(c);
      setPrefCookie("country", c);
      // Default the display currency to the country's own; the visitor can still switch.
      setCurrencyState(currencyOf(c));
      setPrefCookie("currency", currencyOf(c));
      router.refresh();
    };
    const setCurrency = (c: Currency) => {
      setCurrencyState(c);
      setPrefCookie("currency", c);
      router.refresh();
    };

    return {
      viewer,
      language,
      setLanguage,
      t: translations[language],
      country,
      setCountry,
      currency,
      setCurrency,
      isDarkMode,
      toggleTheme: () => setIsDarkMode((d) => !d),
      draft,
      addToDraft: (line) => {
        const same = draft.find(
          (l) => l.productId === line.productId && l.startDate === line.startDate && l.endDate === line.endDate,
        );
        if (same) {
          const max = Math.min(same.maxQuantity, line.maxQuantity);
          persist(draft.map((l) => (l === same ? { ...l, quantity: Math.min(max, l.quantity + line.quantity), maxQuantity: max } : l)));
        } else {
          persist([...draft, { ...line, quantity: Math.min(line.quantity, line.maxQuantity), id: crypto.randomUUID() }]);
        }
      },
      updateDraftQuantity: (id, quantity) => {
        const q = Math.floor(quantity);
        persist(
          q < 1
            ? draft.filter((l) => l.id !== id)
            : draft.map((l) => (l.id === id ? { ...l, quantity: Math.min(q, l.maxQuantity) } : l)),
        );
      },
      removeFromDraft: (id) => persist(draft.filter((l) => l.id !== id)),
      clearDraft: () => persist([]),
      eventDates,
      setEventDates,
      previewProduct,
      setPreviewProduct,
      bookingProduct,
      setBookingProduct,
    };
  }, [viewer, language, country, currency, isDarkMode, draft, persist, eventDates, previewProduct, bookingProduct, router]);

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
