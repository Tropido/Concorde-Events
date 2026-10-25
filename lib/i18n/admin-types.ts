import type { AccountStatus, AppRole, MessageChannel, MessageStatus, RequestStatus, Tone } from "@/lib/types";

export type AdminErrorCode =
  | "capacity_exceeded" | "quote_expired" | "invalid_transition" | "forbidden"
  | "invalid" | "slug_taken" | "upload_failed" | "last_admin" | "generic";

type Flag = "vip" | "big_account" | "reliable_payer" | "watch" | "new_partner" | "dispute_resolved";
type Level = "bronze" | "argent" | "or" | "platine" | "diamant" | "royal_elite";

export interface AdminTranslations {
  title: string;
  badge: string;
  nav: {
    groupOps: string; groupCatalogue: string; groupSite: string; overview: string; requests: string; inbox: string;
    inventory: string; rentals: string; clients: string; analytics: string; cms: string; settings: string; backToSite: string;
  };
  errors: Record<AdminErrorCode, string>;
  saved: string;
  overview: {
    morning: string; afternoon: string; evening: string; toReview: string; kpiBooked: string; kpiRequests: string;
    kpiPipeline: string; kpiAverage: string; quotesOpen: (n: number) => string; last30: string; noComparison: string;
    chartBooked: string; chartRequests: string; chartMetric: string; metricBooked: string; metricRequests: string;
    chartEmpty: string; requestsCount: (n: number) => string; live: string; today: string; departures: string;
    returns: string; noDepartures: string; noReturns: string; byCategory: string; utilisation: string;
    unitsInUse: (used: number, usable: number) => string; conflicts: string; conflictsNone: string;
    conflictsCount: (n: number) => string; pendingPros: (n: number) => string;
  };
  requests: {
    subtitle: (n: number) => string; searchPlaceholder: string; empty: string; client: string; event: string; window: string;
    nextQuote: string; nextConfirm: string; nextDispatch: string; nextReturn: string; contactConfirmed: string;
    whatsappOpened: string; noContactYet: string; created: string; confirm: string; dispatch: string; reject: string;
    cancel: string; prefers: string; call: string; createTicket: string; markContacted: string; assignedTo: string;
    assignMe: string; unassigned: string; eventType: string; lines: string; product: string; qty: string; period: string;
    unit: string; lineTotal: string; reschedule: string; saveDates: string; quotes: string; noQuotes: string;
    quoteValidUntil: string; issueQuote: string; validityDays: string; returnTitle: string; damaged: string;
    damagedHint: string; confirmReturn: string; confirmPrompt: string; nextStep: string;
    nextStepText: Record<RequestStatus, string>; waGreeting: (name: string, ref: string) => string;
  };
  inbox: {
    subtitle: string; channelLabel: string; channel: Record<MessageChannel, string>; status: Record<MessageStatus, string>;
    moveTo: Record<MessageStatus, string>; unresolved: string; empty: string; assignMe: string; internal: string;
    publicReply: string; sentWhatsapp: string; reply: string; waPlaceholder: string; sendWhatsapp: string; sendReply: string;
    internalNote: string; newTicket: string; ticketHint: string; name: string; phone: string; email: string;
    requestRef: string; subject: string; body: string; create: string;
  };
  inventory: {
    subtitle: string; newProduct: string; viewOnSite: string; kpiActive: string; kpiUnits: string; kpiMaintenance: string;
    kpiAssets: string; views: { active: string; retired: string; all: string }; searchPlaceholder: string; empty: string;
    piece: string; category: string; stock: string; retail: string; pro: string; inMaintenance: (n: number) => string;
    featured: string; retire: string; reactivate: string;
    sections: { title: string; general: string; media: string; look: string; specs: string; pricing: string; internal: string };
    titleFr: string; titleAr: string; descFr: string; descAr: string; slug: string; slugHint: string; sku: string; skuHint: string;
    noCategory: string; badge: string; noBadge: string; visible: string; uploadHint: string; cover: string; makeCover: string;
    removeImage: string; moveUp: string; moveDown: string; upload: string; uploading: string; tone: string;
    tones: Record<Tone, string>; color: string; colorHex: string; colorPlaceholder: string; material: string; finish: string;
    style: string; stylePlaceholder: string; highlightsFr: string; highlightsAr: string; highlightsHint: string;
    tags: string; tagsHint: string; width: string; height: string; depth: string; unit: string; weight: string; seats: string;
    setup: string; minNights: string; careFr: string; careAr: string; carePlaceholder: string; pricesHint: string;
    pricesAdminOnly: string; deposit: string; depositHint: string; tierPreview: string; owned: string; ownedHint: string;
    internalHint: string; purchaseCost: string; purchaseDate: string; condition: string;
    conditions: { new: string; excellent: string; good: string; fair: string }; supplier: string; storage: string;
    storagePlaceholder: string; breakEven: string; internalNotes: string; save: string; preview: string; untitled: string;
    assetValue: string; maintenance: string; repaired: string; writtenOff: string;
  };
  rentals: {
    subtitle: string; out: string; upcoming: string; none: string; noUpcoming: string; late: string; due: string; leaves: string;
    maintenanceTitle: string; maintenanceEmpty: string;
  };
  clients: {
    subtitle: string; views: { label: string; pending: string; pros: string; customers: string; staff: string; inactive: string };
    searchPlaceholder: string; noPending: string; empty: string; approve: string; reject: string; suspend: string;
    reactivate: string; changeRole: string; statusLabels: Record<AccountStatus, string>; roleLabels: Record<AppRole, string>;
    flagLabels: Record<Flag, string>; identity: string; requestsCount: string; bookedValue: string; joined: string;
    programme: string; lockTier: string; tierLocked: string; tierAuto: string; nextAt: (tier: string, points: string) => string;
    customDiscount: string; extraBenefits: string; benefitPlaceholder: string; addBenefit: string; saveProgramme: string;
    adjustPoints: string; reason: string; reasonPlaceholder: string; applyPoints: string; particulierTitle: string;
    particulierText: string; notesTitle: string; flags: string; level: string; levelLabels: Record<Level, string>;
    notes: string; notesPlaceholder: string; notesPrivate: string; saveNotes: string;
  };
  analytics: {
    subtitle: string; bookedYear: string; conversion: string; conversionHint: string; proShare: string; retailShare: string;
    booked: string; bookedHint: string; countsByStatus: string; byEvent: string; assets: string; assetsHint: string;
    piece: string; nightsBooked: string; revenue: string; cost: string; roi: string; noCost: string;
  };
  cms: {
    locale: string; hero: string; heroBadge: string; heroTitle: string; heroAccent: string; heroSubtitle: string;
    faqs: string; question: string; answer: string; addFaq: string; testimonials: string; testimonialsHint: string;
    quote: string; author: string; role: string; addTestimonial: string; remove: string; publish: string; publishedAt: string;
    emptyFallback: string;
  };
  settings: {
    subtitle: string; tiersTitle: string; tiersHint: string; adminOnly: string; color: string; nameFr: string; nameAr: string;
    minPoints: string; discount: string; benefitsFr: string; benefitsAr: string; businessTitle: string; currency: string;
    whatsapp: string; languages: string; businessHint: string; pointsTitle: string; pointsText: string;
  };
}
