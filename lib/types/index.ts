import type { Language } from "@/lib/i18n/translations";

// Mirrors the enums in supabase/migrations.
export type AppRole = "customer" | "professional" | "editor" | "manager" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
/** Database enum. The business is Tunisia-only; "FR" only exists on historical rows. */
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
export type EventType = "wedding" | "engagement" | "birthday" | "corporate" | "gala" | "private" | "other";
export const EVENT_TYPES: EventType[] = ["wedding", "engagement", "birthday", "corporate", "gala", "private", "other"];
export type DeliveryMode = "delivery" | "pickup";
export type ContactChannel = "whatsapp" | "phone" | "email";
export type Tone = "almond" | "sand" | "tan" | "copper" | "cream" | "stone";
export const TONES: Tone[] = ["almond", "sand", "tan", "copper", "cream", "stone"];
export type ProductBadge = "new" | "bestseller" | "limited";

/** Operations staff (requests, stock, clients, inbox). */
export const OPS_ROLES: AppRole[] = ["manager", "admin"];
/** Everyone who may open /admin (editors only see the CMS). */
export const STAFF_ROLES: AppRole[] = ["editor", "manager", "admin"];

export interface ProTier {
  code: string;
  rank: number;
  name: string;
  minPoints: number;
  discount: number;
  benefits: string[];
  color: string;
}

/** A professional's programme as the database reports it (read through RLS). */
export interface ProStatus {
  tier: ProTier;
  next: ProTier | null;
  points: number;
  /** Effective discount on pro prices (custom rate or the tier's). */
  discount: number;
  benefits: string[];
  locked: boolean;
}

/** The signed-in user as trusted from the database (never from the JWT metadata). */
export interface Viewer {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  vatNumber: string | null;
  activity: string | null;
  city: string | null;
  website: string | null;
  role: AppRole;
  status: AccountStatus;
  pro: ProStatus | null;
}

export const isApprovedPro = (v: Viewer | null) => v?.role === "professional" && v.status === "approved";
export const isStaff = (v: Viewer | null, roles: AppRole[] = STAFF_ROLES) =>
  !!v && v.status === "approved" && roles.includes(v.role);

/** A nightly price in TND as this viewer pays it. */
export interface Price {
  /** What this viewer pays per night (pro rate minus programme discount for approved pros). */
  amount: number;
  /** Public retail rate, for comparison. */
  retail: number | null;
  tier: PriceTier;
  discount: number;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  sku: string | null;
  title: string;
  description: string;
  /** Language the title/description are actually in (AR falls back to FR). */
  lang: Language;
  category: { id: string; slug: string; name: string } | null;
  dimensions: { width: number | null; height: number | null; depth: number | null; unit: "cm" | "m" };
  color: string | null;
  colorHex: string | null;
  material: string | null;
  finish: string | null;
  style: string | null;
  weightKg: number | null;
  seatingCapacity: number | null;
  setupMinutes: number | null;
  deposit: number | null;
  highlights: string[];
  care: string | null;
  tags: string[];
  badge: ProductBadge | null;
  tone: Tone;
  minimumNights: number;
  featured: boolean;
  images: string[];
  /** Usable units (owned minus maintenance), ignoring bookings. */
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
  tone: Tone;
  quantity: number;
  /** Date-specific availability when the line was added; the server re-checks. */
  maxQuantity: number;
  startDate: string;
  endDate: string;
  /** Nightly price shown when added (estimate only; the server prices the request). */
  unitPrice: number | null;
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

/** Frozen at issue time by public.issue_quote(); never recomputed. Older quotes may carry
 *  EUR and an exchange rate; quotes issued now are always TND. */
export interface QuoteSnapshot {
  reference: string;
  revision: number;
  issued_at: string;
  valid_until: string;
  country: Country;
  tier: PriceTier;
  discount_percent?: number;
  source_currency: Currency;
  currency: Currency;
  fx: { rate_eur_tnd: number; source: "provider" | "manual"; rate_time: string } | null;
  customer: { name: string; email: string; phone: string; company: string | null };
  event?: { type: EventType | null; venue: string | null; guests: number | null; delivery_mode: DeliveryMode | null };
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
