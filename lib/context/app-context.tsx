"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { CatalogueProduct, DraftLine, Viewer } from "@/lib/types";
import { setPrefCookie, type Prefs } from "@/lib/prefs";
import { translations, type Language, type Translations } from "@/lib/i18n/translations";

export interface Toast {
  id: string;
  title: string;
  image?: string | null;
  tone?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}

// UI state only. Server data (catalogue, requests, users…) is fetched by server components
// through Supabase + RLS and passed down as props.
interface AppContextType {
  viewer: Viewer | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;

  draft: DraftLine[];
  addToDraft: (line: Omit<DraftLine, "id">) => void;
  updateDraftQuantity: (id: string, quantity: number) => void;
  removeFromDraft: (id: string) => void;
  clearDraft: () => void;
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  /** Increments on every add, so the bag button can animate. */
  bagPulse: number;

  /** Event dates the visitor chose once (e.g. on the homepage); defaults for new lines. */
  eventDates: { start: string; end: string };
  setEventDates: (d: { start: string; end: string }) => void;

  previewProduct: CatalogueProduct | null;
  setPreviewProduct: (p: CatalogueProduct | null) => void;
  bookingProduct: CatalogueProduct | null;
  setBookingProduct: (p: CatalogueProduct | null) => void;

  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const DRAFT_KEY = "concorde:draft:v3";

function readDraft(): DraftLine[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftLine[]) : [];
  } catch {
    return [];
  }
}

export function AppProvider({ children, prefs, viewer }: { children: React.ReactNode; prefs: Prefs; viewer: Viewer | null }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(prefs.lang);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagPulse, setBagPulse] = useState(0);
  const [eventDates, setEventDatesState] = useState({ start: "", end: "" });
  const [previewProduct, setPreviewProduct] = useState<CatalogueProduct | null>(null);
  const [bookingProduct, setBookingProduct] = useState<CatalogueProduct | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => setLanguageState(prefs.lang), [prefs.lang]);
  useEffect(() => {
    setDraft(readDraft());
    try {
      const d = JSON.parse(sessionStorage.getItem("concorde:dates") ?? "null");
      if (d?.start) setEventDatesState(d);
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: DraftLine[]) => {
    setDraft(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode): the draft still works for this page view.
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((all) => all.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback((x: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((all) => [...all.slice(-2), { ...x, id }]);
    timers.current.set(id, setTimeout(() => dismissToast(id), 4200));
  }, [dismissToast]);

  const value = useMemo<AppContextType>(() => {
    const setLanguage = (lang: Language) => {
      setLanguageState(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      setPrefCookie("lang", lang);
      router.refresh();
    };

    return {
      viewer,
      language,
      setLanguage,
      t: translations[language],
      draft,
      addToDraft: (line) => {
        const same = draft.find((l) => l.productId === line.productId && l.startDate === line.startDate && l.endDate === line.endDate);
        if (same) {
          const max = Math.min(same.maxQuantity, line.maxQuantity);
          persist(draft.map((l) => (l === same ? { ...l, quantity: Math.min(max, l.quantity + line.quantity), maxQuantity: max } : l)));
        } else {
          persist([...draft, { ...line, quantity: Math.min(line.quantity, line.maxQuantity), id: crypto.randomUUID() }]);
        }
        setBagPulse((n) => n + 1);
      },
      updateDraftQuantity: (id, quantity) => {
        const q = Math.floor(quantity);
        persist(q < 1 ? draft.filter((l) => l.id !== id) : draft.map((l) => (l.id === id ? { ...l, quantity: Math.min(q, l.maxQuantity) } : l)));
      },
      removeFromDraft: (id) => persist(draft.filter((l) => l.id !== id)),
      clearDraft: () => persist([]),
      bagOpen,
      setBagOpen,
      bagPulse,
      eventDates,
      setEventDates: (d) => {
        setEventDatesState(d);
        try {
          sessionStorage.setItem("concorde:dates", JSON.stringify(d));
        } catch {
          // ignore
        }
      },
      previewProduct,
      setPreviewProduct,
      bookingProduct,
      setBookingProduct,
      toasts,
      toast,
      dismissToast,
    };
  }, [viewer, language, draft, persist, bagOpen, bagPulse, eventDates, previewProduct, bookingProduct, toasts, toast, dismissToast, router]);

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
