import type { DeliveryMode, ContactChannel, EventType, ProductBadge, RequestStatus } from "@/lib/types";
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

export type Activity = "wedding_planner" | "agency" | "venue" | "caterer" | "designer" | "photographer" | "other";
type Sort = "featured" | "price_asc" | "price_desc" | "name";
type Item = { title: string; text: string };

// Record<Language, Translations> makes the compiler reject a missing key in either language.
export interface Translations {
  meta: { title: string; description: string };
  nav: {
    home: string; catalogue: string; decoration: string; pros: string; about: string; contact: string;
    account: string; admin: string; logIn: string; signUp: string; menu: string; language: string;
  };
  common: {
    loading: string; save: string; saving: string; cancel: string; close: string; back: string; confirm: string;
    edit: string; delete: string; search: string; all: string; optional: string; signOut: string; perNight: string;
    total: string; status: string; actions: string; details: string; reference: string; open: string; viewAll: string;
    units: (n: number) => string; nights: (n: number) => string; priceOnRequest: string; errorGeneric: string; retry: string;
    notFoundTitle: string; notFoundText: string; backHome: string; unavailableTitle: string; unavailableText: string;
    noData: string; skipToContent: string;
  };
  requestStatus: Record<RequestStatus, string>;
  eventTypes: Record<EventType, string>;
  hero: {
    badge: string; title: string; titleAccent: string; subtitle: string; ctaExplore: string; ctaWhatsapp: string;
    whatsappGreeting: string; facts: Item[];
    quickBooking: { title: string; startDate: string; endDate: string; save: string; hint: string; datesSaved: string };
  };
  home: {
    featuredLabel: string; badgeRing: string; chooseDates: string; catalogueSoon: string; collection: string;
    picksTitle: string; viewAll: string; howTitle: string; howIntro: string; steps: Item[];
    faqTitle: string; faqs: { question: string; answer: string }[];
  };
  categories: { title: string; pieces: (n: number) => string };
  testimonials: { title: string };
  catalogue: {
    title: string; subtitle: string; searchPlaceholder: string; filterLabel: string; sortLabel: string; sort: Record<Sort, string>;
    resetFilters: string; noResults: string; emptyTitle: string; emptyText: string; inStock: (n: number) => string;
    book: string; uncategorised: string;
  };
  booking: {
    title: string; start: string; end: string; quantity: string; available: (n: number) => string; soldOut: string;
    soldOutShort: string; checking: string; add: string; minNights: (n: number) => string; nightsRule: string;
    summary: (qty: number, nights: number) => string; rangeErrors: Record<RangeProblem, string>; decrease: string; increase: string;
  };
  calendar: { prev: string; next: string; hint: string };
  scheduling: { legendAvailable: string; legendSelected: string; legendLimited: string; legendFull: string };
  bag: {
    title: string; short: string; pieces: (n: number) => string; emptyTitle: string; emptyText: string; browse: string;
    estimate: string; estimateNote: string; checkout: string; remove: string; added: (title: string) => string; view: string;
  };
  checkout: {
    label: string; title: string; contactTitle: string; name: string; phone: string; email: string; company: string;
    eventTitle: string; eventType: string; venue: string; venuePlaceholder: string; guests: string; deliveryTitle: string;
    delivery: Record<DeliveryMode, Item>; confirmTitle: string; contactPref: string; contactOptions: Record<ContactChannel, string>;
    notes: string; notesPlaceholder: string; summary: string; send: string; sending: string; noPayment: string;
    thanksTitle: string; thanksText: string; openWhatsapp: string; track: string; createAccount: string;
    whatsappIntro: (ref: string) => string; whatsappContact: string;
  };
  submitErrors: Record<SubmitErrorCode, string>;
  product: {
    breadcrumb: string; badges: Record<ProductBadge, string>; seats: (n: number) => string; setup: (minutes: number) => string;
    deposit: (amount: string) => string; material: string; finish: string; style: string; reference: string; minimum: string;
    dimensions: string; weight: string; capacity: string; dimensionsOnRequest: string;
    tabs: { details: string; dimensions: string; care: string }; infoTabs: string;
    proPriceNote: (discount: number) => string; retailNote: string; related: string;
    favourite: string; unfavourite: string; signInToSave: string;
  };
  pro: {
    teaserLabel: string; teaserTitle: string; teaserText: string; become: string; learnMore: string;
    tierDiscount: (n: number) => string; proRates: string; pricesShown: (tier: string, discount: number) => string;
    discountApplied: (tier: string) => string; memberOf: (tier: string) => string;
    pageTitle: string; pageIntro: string; mySpace: string; howPointsLabel: string; pointsRule: string; pointsText: string;
    compareTitle: string; feature: string; compare: { label: string; customer: boolean | string; pro: boolean | string }[];
    yes: string; no: string; tiersTitle: string; fromPoints: (n: string) => string; entry: string;
    everythingIn: (name: string) => string; tiersNote: string; yourTier: string; points: string;
    toNext: (points: string, tier: string) => string; topTier: string; progress: string; yourBenefits: string;
    history: string; historyEmpty: string; reasonCompleted: (ref: string) => string;
  };
  auth: {
    loginTitle: string; loginSubtitle: string; adminLoginTitle: string; adminLoginSubtitle: string; email: string;
    password: string; forgot: string; submitLogin: string; noAccount: string; registerTitle: string; registerSubtitle: string;
    accountType: string; customer: string; customerHint: string; professional: string; professionalHint: string;
    proSection: string; proNote: string; fullName: string; phone: string; city: string; company: string; activity: string;
    activityPlaceholder: string; activities: Record<Activity, string>; vat: string; website: string; passwordHint: string;
    submitRegister: string; submitPro: string; haveAccount: string; checkEmailTitle: string; checkEmailText: string;
    checkEmailPro: string; forgotTitle: string; forgotSubtitle: string; sendReset: string; resetSent: string;
    resetTitle: string; newPassword: string; confirmPassword: string; updatePassword: string; linkInvalid: string;
    noStaffAccess: string;
    errors: { invalidCredentials: string; emailNotConfirmed: string; weakPassword: string; mismatch: string; rateLimited: string; proFields: string; generic: string };
    pendingTitle: string; rejectedTitle: string; rejectedText: string; suspendedTitle: string; suspendedText: string;
    asideTitle: string; customerPerks: string[]; proPerks: string[];
  };
  account: {
    title: string; welcome: (name: string) => string; requests: string; proSpace: string; favourites: string; messages: string;
    profile: string; particulier: string; openRequests: string; nextEvent: string; totalRequests: string; request: string;
    noRequests: string; noFavourites: string; viewQuote: string; noQuote: string; estimate: string; requestedOn: string;
    cancel: string; cancelConfirm: string; quoteValidUntil: (d: string) => string; revision: (n: number) => string;
    newMessage: string; subject: string; message: string; send: string; noMessages: string; reply: string;
    staffReply: string; you: string; profileSaved: string; proToolsTitle: string; proToolsIntro: string; proOnly: string;
    calcProduct: string; marginLabel: string; clientPrice: string; costPrice: string; profit: string; pendingBanner: string;
  };
  contact: {
    title: string; subtitle: string; name: string; email: string; phone: string; subject: string; message: string;
    send: string; sending: string; sent: string; whatsappTitle: string; whatsappText: string; whatsappButton: string;
    addressPending: string;
  };
  about: { title: string; intro: string; sections: Item[]; cta: string };
  quote: {
    title: string; issuer: string; print: string; issuedOn: string; validUntil: string; client: string; event: string;
    guests: (n: number) => string; period: string; item: string; qty: string; nights: string; unitPrice: string;
    lineTotal: string; total: string; legacyFx: (rate: string) => string; notInvoice: string; tierPro: string;
    tierRetail: string; notes: string;
  };
  footer: {
    statement: string; aboutText: string; shop: string; account: string; proRegister: string; myRequests: string;
    whatsapp: string; whatsappCta: string; rights: string; tagline: string;
  };
  admin: AdminTranslations;
}

export const translations: Record<Language, Translations> = { fr, ar };
