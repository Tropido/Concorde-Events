import type { RequestStatus } from "@/lib/types";
import type { RangeProblem } from "@/lib/dates";
import type { AdminTranslations } from "./admin-types";
import { fr } from "./fr";
import { ar } from "./ar";

export type Language = "fr" | "ar";

/** Error codes raised by public.submit_request / submit_contact (see migrations). */
export type SubmitErrorCode =
  | "invalid_contact" | "invalid_lines" | "invalid_quantity" | "invalid_date" | "invalid_range"
  | "date_in_past" | "range_too_long" | "below_minimum_nights" | "unknown_product" | "price_missing"
  | "rate_limited" | "account_inactive" | "generic";

// Record<Language, Translations> makes the compiler reject a missing key in either language.
export interface Translations {
  announcement: string;
  nav: {
    home: string; catalogue: string; about: string; contact: string; dashboard: string;
    requestDraft: string; logIn: string; signUp: string; account: string; admin: string;
    menu: string; theme: string; language: string; stockCountry: string; displayCurrency: string;
  };
  common: {
    loading: string; save: string; saving: string; cancel: string; close: string; back: string;
    confirm: string; edit: string; delete: string; search: string; all: string; optional: string;
    signOut: string; perNight: string; total: string; status: string; actions: string; details: string;
    reference: string; country: string; currency: string; france: string; tunisia: string;
    units: (n: number) => string; nights: (n: number) => string;
    priceOnRequest: string; conversionUnavailable: string; ratesBy: string;
    rateAsOf: (date: string) => string; errorGeneric: string; retry: string;
    notFoundTitle: string; notFoundText: string; backHome: string;
    unavailableTitle: string; unavailableText: string; noData: string;
  };
  requestStatus: Record<RequestStatus, string>;
  hero: {
    badge: string; title: string; titleAccent: string; subtitle: string; ctaExplore: string; ctaWhatsapp: string;
    whatsappGreeting: string;
    quickBooking: { title: string; startDate: string; endDate: string; checkAvailability: string; datesSaved: string };
  };
  home: { newProducts: string; availabilityHint: string; faqBadge: string; faqTitle: string; exploreCategory: string; faqs: { question: string; answer: string }[] };
  showcase: { badge: string; title: string; subtitle: string; viewAll: string; quickPreview: string; addToDraft: string; selectDates: string };
  categories: { badge: string; title: string; viewAll: string; piecesCount: string };
  scheduling: { badge: string; title: string; subtitle: string; legendAvailable: string; legendSelected: string; legendLimited: string; legendFull: string; unitsAvailable: string };
  craftsmanship: { badge: string; title: string; subtitle: string; pillars: { title: string; desc: string }[] };
  testimonials: { badge: string; title: string };
  catalogue: {
    badge: string; title: string; subtitle: string; searchPlaceholder: string; allCategories: string;
    allMaterials: string; resetFilters: string; noResults: string; inStock: (n: number) => string;
    book: string; gridView: string; listView: string; proRate: string; retailRate: string; emptyCountry: string;
  };
  booking: {
    title: string; start: string; end: string; quantity: string; available: (n: number) => string;
    soldOut: string; checking: string; add: string; minNights: (n: number) => string; unitPrice: string;
    rangeErrors: Record<RangeProblem, string>; decrease: string; increase: string;
  };
  calendar: { prev: string; next: string; hint: string; selection: string };
  draft: {
    badge: string; title: string; empty: string; lines: (n: number) => string; remove: string;
    estimatedTotal: string; estimateNote: string; submit: string; contactTitle: string; contactIntro: string;
    name: string; phone: string; email: string; company: string; notes: string; notesPlaceholder: string;
    send: string; sending: string; successTitle: string; successText: (ref: string) => string;
    openWhatsapp: string; whatsappIntro: (ref: string) => string; whatsappContact: string;
    trackInAccount: string; countryNote: (country: string) => string;
  };
  submitErrors: Record<SubmitErrorCode, string>;
  product: {
    back: string; reference: string; dimensions: string; material: string; finish: string;
    stock: (n: number) => string; minimumNights: (n: number) => string; availabilityTitle: (title: string) => string;
    related: string; featured: string; standard: string; favourite: string; unfavourite: string; signInToSave: string;
  };
  auth: {
    loginTitle: string; loginSubtitle: string; adminLoginTitle: string; adminLoginSubtitle: string;
    email: string; password: string; forgot: string; submitLogin: string; noAccount: string;
    registerTitle: string; registerSubtitle: string; accountType: string; customer: string; professional: string;
    proNote: string; fullName: string; phone: string; company: string; vat: string; passwordHint: string;
    submitRegister: string; haveAccount: string; checkEmailTitle: string; checkEmailText: string;
    forgotTitle: string; forgotSubtitle: string; sendReset: string; resetSent: string;
    resetTitle: string; newPassword: string; confirmPassword: string; updatePassword: string; passwordUpdated: string;
    linkInvalid: string; noStaffAccess: string;
    errors: { invalidCredentials: string; emailNotConfirmed: string; weakPassword: string; mismatch: string; rateLimited: string; generic: string };
    pendingTitle: string; pendingText: string; rejectedTitle: string; rejectedText: string; suspendedTitle: string; suspendedText: string;
  };
  account: {
    title: string; welcome: (name: string) => string; requests: string; favourites: string; messages: string;
    tools: string; profile: string; noRequests: string; noFavourites: string; viewQuote: string; noQuote: string;
    lines: string; dates: string; requestedOn: string; cancel: string; cancelConfirm: string; quoteValidUntil: (d: string) => string;
    revision: (n: number) => string; newMessage: string; subject: string; message: string; send: string;
    noMessages: string; reply: string; staffReply: string; you: string; profileSaved: string;
    proToolsTitle: string; proToolsIntro: string; proOnly: string; marginLabel: string; clientPrice: string;
    costPrice: string; profit: string; pendingBanner: string;
  };
  contact: {
    badge: string; title: string; subtitle: string; name: string; email: string; phone: string; subject: string;
    message: string; send: string; sending: string; sent: string; whatsappTitle: string; whatsappText: string;
    whatsappButton: string; addressPending: string;
  };
  about: { badge: string; title: string; intro: string; sections: { title: string; text: string }[]; cta: string };
  quote: {
    title: string; print: string; issuedOn: string; validUntil: string; client: string; period: string;
    item: string; qty: string; nights: string; unitPrice: string; lineTotal: string; total: string;
    fxNote: (rate: string, source: string, date: string) => string; manualRate: string; providerRate: string;
    notInvoice: string; tierPro: string; tierRetail: string; notes: string;
  };
  admin: AdminTranslations;
  footer: { tagline: string; aboutText: string; quickLinks: string; legal: string; rights: string; whatsapp: string; proSpace: string; proLogin: string; proRegister: string; proTools: string };
}

export const translations: Record<Language, Translations> = { fr, ar };
