import type { Language } from "@/lib/i18n/translations";

// Mirrors the enums in supabase/migrations.
export type AppRole = "customer" | "professional" | "editor" | "manager" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type Country = "FR" | "TN";
export type Currency = "EUR" | "TND";
export type PriceTier = "retail" | "pro";
export type RequestStatus =
  | "submitted"
  | "validated"
  | "confirmed"
  | "dispatched"
  | "completed"
  | "cancelled"
  | "rejected";
export type MessageChannel = "site" | "contact" | "whatsapp";
export type MessageStatus = "open" | "in_progress" | "resolved";

/** Operations staff (requests, stock, clients, inbox). */
export const OPS_ROLES: AppRole[] = ["manager", "admin"];
/** Everyone who may open /admin (editors only see the CMS). */
export const STAFF_ROLES: AppRole[] = ["editor", "manager", "admin"];

/** The signed-in user as trusted from the database (never from the JWT metadata). */
export interface Viewer {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  vatNumber: string | null;
  country: Country | null;
  role: AppRole;
  status: AccountStatus;
}

export const isApprovedPro = (v: Viewer | null) => v?.role === "professional" && v.status === "approved";
export const isStaff = (v: Viewer | null, roles: AppRole[] = STAFF_ROLES) =>
  !!v && v.status === "approved" && roles.includes(v.role);

/** A nightly price as this viewer pays it. `amount` is null when the display currency
 *  needs an exchange rate that is currently unavailable. */
export interface Price {
  amount: number | null;
  currency: Currency;
  sourceAmount: number;
  sourceCurrency: Currency;
  tier: PriceTier;
}

export interface FxInfo {
  rate: number;
  source: "provider" | "manual";
  rateTime: string;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Language the title/description are actually in (AR falls back to FR). */
  lang: Language;
  category: { id: string; slug: string; name: string } | null;
  dimensions: { width: number | null; height: number | null; depth: number | null; unit: "cm" | "m" };
  color: string | null;
  material: string | null;
  tags: string[];
  minimumNights: number;
  featured: boolean;
  images: string[];
  /** Usable units in the selected country (owned minus maintenance), ignoring bookings. */
  stock: number;
  price: Price | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  count: number;
}

export interface DraftLine {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  quantity: number;
  /** Date-specific availability when the line was added; the server re-checks. */
  maxQuantity: number;
  startDate: string;
  endDate: string;
}

export interface QuoteLine {
  line_id: string;
  product_id: string;
  slug: string;
  title_fr: string;
  title_ar: string | null;
  quantity: number;
  start_date: string;
  end_date: string;
  nights: number;
  source_unit_price: number;
  unit_price: number;
  line_total: number;
}

/** Frozen at issue time by public.issue_quote(); never recomputed. */
export interface QuoteSnapshot {
  reference: string;
  revision: number;
  issued_at: string;
  valid_until: string;
  country: Country;
  tier: PriceTier;
  source_currency: Currency;
  currency: Currency;
  fx: { rate_eur_tnd: number; source: "provider" | "manual"; rate_time: string } | null;
  customer: { name: string; email: string; phone: string; company: string | null };
  notes: string | null;
  lines: QuoteLine[];
  total: number;
}

/** Published homepage content (per locale). Every field is optional: missing ones fall
 *  back to the dictionary copy. */
export interface CMSContent {
  hero?: { badge?: string; title?: string; titleAccent?: string; subtitle?: string };
  faqs?: { question: string; answer: string }[];
  /** Real client quotes only; the section is hidden when empty. */
  testimonials?: { quote: string; author: string; role?: string }[];
}
