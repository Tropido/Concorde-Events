import type { AccountStatus, AppRole, MessageChannel, MessageStatus } from "@/lib/types";

export type AdminErrorCode =
  | "capacity_exceeded" | "fx_unavailable" | "quote_expired" | "invalid_transition" | "forbidden"
  | "invalid" | "slug_taken" | "upload_failed" | "jump_too_large" | "provider" | "last_admin" | "generic";

export interface AdminTranslations {
  title: string;
  nav: { overview: string; requests: string; inbox: string; inventory: string; rentals: string; clients: string; analytics: string; cms: string; settings: string; backToSite: string };
  errors: Record<AdminErrorCode, string>;
  saved: string;
  overview: {
    byStatus: string; conflicts: string; conflictsNone: string; recent: string; openInbox: string;
    pendingPros: string; fx: string; fxNone: string; outNow: string;
  };
  requests: {
    filterAll: string; empty: string; client: string; window: string; created: string; whatsappOpened: string;
    contactConfirmed: string; markContacted: string; assignedTo: string; assignMe: string; unassigned: string;
    lines: string; product: string; qty: string; period: string; unitSource: string; lineTotal: string; tier: string;
    issueQuote: string; quoteCurrency: string; validityDays: string; issue: string; quotes: string;
    confirm: string; dispatch: string; reject: string; cancel: string; reschedule: string; saveDates: string;
    returnTitle: string; damaged: string; confirmReturn: string; notes: string; createTicket: string;
    confirmPrompt: string; sourceNote: string; quoteValidUntil: string;
  };
  inbox: {
    channel: Record<MessageChannel, string>; status: Record<MessageStatus, string>; empty: string; from: string;
    reply: string; internalNote: string; sendReply: string; newTicket: string; subject: string; body: string;
    name: string; phone: string; email: string; requestRef: string; create: string; assignMe: string; internal: string;
  };
  inventory: {
    newProduct: string; edit: string; retire: string; reactivate: string; retired: string; slug: string; slugHint: string;
    titleFr: string; titleAr: string; descFr: string; descAr: string; category: string; noCategory: string;
    width: string; height: string; depth: string; unit: string; color: string; material: string; tags: string; tagsHint: string;
    minNights: string; featured: string; images: string; upload: string; uploading: string; removeImage: string;
    uploadHint: string; stockFor: (country: string) => string; owned: string; maintenance: string; repaired: string;
    writtenOff: string; prices: string; retail: string; pro: string; pricesAdminOnly: string; save: string; empty: string;
    noPrice: string;
  };
  rentals: { out: string; late: string; maintenanceTitle: string; maintenanceEmpty: string; none: string; due: string };
  clients: {
    pending: string; all: string; role: string; status: string; approve: string; reject: string; suspend: string;
    reactivate: string; changeRole: string; notes: string; flags: string; flagsHint: string; level: string; saveNotes: string;
    empty: string; joined: string; statusLabels: Record<AccountStatus, string>; roleLabels: Record<AppRole, string>;
  };
  analytics: {
    countsByStatus: string; pipeline: string; pipelineHint: string; booked: string; bookedHint: string;
    month: string; utilisation: string; utilisationHint: string; currencyNote: string;
  };
  cms: {
    locale: string; hero: string; heroBadge: string; heroTitle: string; heroAccent: string; heroSubtitle: string;
    faqs: string; question: string; answer: string; addFaq: string; testimonials: string; testimonialsHint: string;
    quote: string; author: string; role: string; addTestimonial: string; remove: string; publish: string; publishedAt: string;
    emptyFallback: string;
  };
  settings: {
    fxTitle: string; fxCurrent: string; fxNone: string; fxSource: string; refresh: string; refreshed: string;
    overrideTitle: string; overrideHint: string; rate: string; hours: string; note: string; setOverride: string;
    adminOnly: string; history: string;
  };
}
