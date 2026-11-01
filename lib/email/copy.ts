import type { Language } from "@/lib/i18n/translations";
import { BRAND_NAME, COMPANY_NAME } from "@/lib/brand";
import { formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";

export type EmailKind =
  | "request_received" | "quote_sent" | "quote_reminder" | "quote_accepted" | "deposit_reminder" | "deposit_overdue"
  | "payment_received" | "booking_confirmed" | "dispatched" | "return_received" | "inspection_closed" | "rental_settled"
  | "cancelled" | "password_reset" | "staff_notice";

/** Everything a template needs. Stored with the email so it can be sent again; links are not
 *  part of it (they are worked out at send time and never stored). */
export interface EmailData {
  reference: string;
  name: string;
  total?: number;
  deposit?: number;
  dueAt?: string;
  validUntil?: string;
  amount?: number;
  /** Payment method, already in the client's language. */
  method?: string;
  remaining?: number;
  dates?: string;
  points?: number;
  reason?: string;
  bank?: { name: string | null; rib: string | null; iban: string | null };
  /** "118 OK · 2 endommagées", one entry per piece. */
  breakdown?: string[];
  fees?: number;
  caution?: string;
  netToPay?: number;
  invoice?: string;
  /** Staff notices: what happened. */
  event?: string;
  /** Password reset: how long the link lasts, in minutes. */
  expiresIn?: number;
}

export interface EmailContent {
  subject: string;
  heading: string;
  paragraphs: string[];
  rows: [string, string][];
  cta?: string;
}

type Fmt = { money: (v: number) => string; day: (iso: string) => string; time: (iso: string) => string };
type Build = (d: EmailData, f: Fmt) => EmailContent;

interface Labels {
  greeting: (name: string) => string; reference: string; total: string; deposit: string; deadline: string; validUntil: string; dates: string;
  amount: string; method: string; remaining: string; bank: string; rib: string; iban: string; mention: string; fees: string; caution: string;
  netToPay: string; invoice: string; contact: string; footer: string; rights: string;
}

const LABELS: Record<Language, Labels> = {
  fr: {
    greeting: (n) => `Bonjour ${n},`, reference: "Référence", total: "Total TTC", deposit: "Acompte", deadline: "À régler avant le", validUntil: "Valable jusqu'au",
    dates: "Dates", amount: "Montant", method: "Mode de paiement", remaining: "Reste à payer", bank: "Banque", rib: "RIB", iban: "IBAN", mention: "À mentionner",
    fees: "Frais de remise en état", caution: "Caution", netToPay: "Net à payer", invoice: "Facture", contact: "Une question ? Écrivez-nous sur WhatsApp :", footer: `${BRAND_NAME} par ${COMPANY_NAME}`, rights: "Location de mobilier événementiel en Tunisie",
  },
  en: {
    greeting: (n) => `Hello ${n},`, reference: "Reference", total: "Total incl. VAT", deposit: "Deposit", deadline: "Pay by", validUntil: "Valid until",
    dates: "Dates", amount: "Amount", method: "Payment method", remaining: "Still to pay", bank: "Bank", rib: "RIB", iban: "IBAN", mention: "Reference to quote",
    fees: "Repair costs", caution: "Security deposit", netToPay: "Net to pay", invoice: "Invoice", contact: "A question? Message us on WhatsApp:", footer: `${BRAND_NAME} by ${COMPANY_NAME}`, rights: "Event furniture hire in Tunisia",
  },
  ar: {
    greeting: (n) => `مرحبًا ${n}،`, reference: "المرجع", total: "المجموع مع الضرائب", deposit: "العربون", deadline: "يُدفع قبل", validUntil: "صالح حتى",
    dates: "التواريخ", amount: "المبلغ", method: "طريقة الدفع", remaining: "المتبقي للدفع", bank: "البنك", rib: "RIB", iban: "IBAN", mention: "يُذكر في التحويل",
    fees: "مصاريف الإصلاح", caution: "الضمان", netToPay: "الصافي للدفع", invoice: "الفاتورة", contact: "لديكم سؤال؟ راسلونا على واتساب:", footer: `${BRAND_NAME} من ${COMPANY_NAME}`, rights: "كراء أثاث المناسبات في تونس",
  },
};

/** The rows common to several emails, in a fixed order, skipping what is absent. */
function rows(d: EmailData, f: Fmt, l: Labels, keys: (keyof EmailData | "bankRows")[]): [string, string][] {
  const out: [string, string][] = [[l.reference, d.reference]];
  for (const k of keys) {
    if (k === "total" && d.total != null) out.push([l.total, f.money(d.total)]);
    if (k === "deposit" && d.deposit != null) out.push([l.deposit, f.money(d.deposit)]);
    if (k === "dueAt" && d.dueAt) out.push([l.deadline, f.time(d.dueAt)]);
    if (k === "validUntil" && d.validUntil) out.push([l.validUntil, f.day(d.validUntil)]);
    if (k === "dates" && d.dates) out.push([l.dates, d.dates]);
    if (k === "amount" && d.amount != null) out.push([l.amount, f.money(d.amount)]);
    if (k === "method" && d.method) out.push([l.method, d.method]);
    if (k === "remaining" && d.remaining != null) out.push([l.remaining, f.money(d.remaining)]);
    if (k === "fees" && d.fees) out.push([l.fees, f.money(d.fees)]);
    if (k === "caution" && d.caution) out.push([l.caution, d.caution]);
    if (k === "netToPay" && d.netToPay != null) out.push([l.netToPay, f.money(d.netToPay)]);
    if (k === "invoice" && d.invoice) out.push([l.invoice, d.invoice]);
    if (k === "bankRows" && d.bank) {
      if (d.bank.name) out.push([l.bank, d.bank.name]);
      if (d.bank.rib) out.push([l.rib, d.bank.rib]);
      if (d.bank.iban) out.push([l.iban, d.bank.iban]);
      out.push([l.mention, d.reference]);
    }
  }
  return out;
}

const fr: Record<EmailKind, Build> = {
  request_received: (d, f) => ({ subject: `Demande reçue · ${d.reference}`, heading: "Nous avons bien reçu votre demande", paragraphs: ["Notre équipe vérifie les disponibilités et vous envoie un devis officiel en dinars très vite."], rows: rows(d, f, LABELS.fr, ["dates"]), cta: "Suivre ma demande" }),
  quote_sent: (d, f) => ({ subject: `Votre devis · ${d.reference}`, heading: "Votre devis est prêt", paragraphs: ["Vous le trouverez en pièce jointe. Acceptez-le en ligne pour réserver vos pièces : la réservation est confirmée après réception de l'acompte."], rows: rows(d, f, LABELS.fr, ["total", "validUntil"]), cta: "Voir et accepter le devis" }),
  quote_reminder: (d, f) => ({ subject: `Votre devis expire bientôt · ${d.reference}`, heading: "Votre devis expire bientôt", paragraphs: ["Passé cette date, les pièces ne seront plus réservées pour vous."], rows: rows(d, f, LABELS.fr, ["total", "validUntil"]), cta: "Voir et accepter le devis" }),
  quote_accepted: (d, f) => ({ subject: `Devis accepté, acompte à régler · ${d.reference}`, heading: "Merci, votre devis est accepté", paragraphs: ["Votre facture d'acompte est en pièce jointe. Votre réservation sera confirmée dès réception de l'acompte."], rows: rows(d, f, LABELS.fr, ["total", "deposit", "dueAt", "bankRows"]), cta: "Suivre ma réservation" }),
  deposit_reminder: (d, f) => ({ subject: `Rappel : acompte à régler · ${d.reference}`, heading: "Votre acompte arrive à échéance", paragraphs: ["Pour garder vos pièces réservées, merci de régler l'acompte avant la date indiquée."], rows: rows(d, f, LABELS.fr, ["deposit", "dueAt", "bankRows"]), cta: "Suivre ma réservation" }),
  deposit_overdue: (d, f) => ({ subject: `Acompte en retard · ${d.reference}`, heading: "Nous n'avons pas encore reçu votre acompte", paragraphs: ["L'échéance est passée. Si vous avez déjà payé, ignorez ce message ou envoyez-nous la preuve de paiement. Sinon, écrivez-nous pour que nous gardions vos dates."], rows: rows(d, f, LABELS.fr, ["deposit", "dueAt", "bankRows"]), cta: "Suivre ma réservation" }),
  payment_received: (d, f) => ({ subject: `Paiement reçu · ${d.reference}`, heading: "Nous avons bien reçu votre paiement", paragraphs: ["Merci. Votre reçu est en pièce jointe."], rows: rows(d, f, LABELS.fr, ["amount", "method", "remaining"]), cta: "Suivre ma réservation" }),
  booking_confirmed: (d, f) => ({ subject: `Réservation confirmée · ${d.reference}`, heading: "Votre réservation est confirmée", paragraphs: ["Vos pièces sont réservées. Notre équipe revient vers vous pour organiser la livraison."], rows: rows(d, f, LABELS.fr, ["dates", "remaining"]), cta: "Voir ma réservation" }),
  dispatched: (d, f) => ({ subject: `Livraison effectuée · ${d.reference}`, heading: "Vos pièces sont livrées", paragraphs: ["Bon événement ! Nous reprendrons le matériel comme convenu."], rows: rows(d, f, LABELS.fr, ["dates"]), cta: "Voir ma réservation" }),
  return_received: (d, f) => ({ subject: `Retour reçu · ${d.reference}`, heading: "Nous avons bien récupéré le matériel", paragraphs: ["Notre équipe l'inspecte pièce par pièce. Vous recevrez le bilan du retour dès que l'inspection sera terminée."], rows: rows(d, f, LABELS.fr, []), cta: "Suivre ma réservation" }),
  inspection_closed: (d, f) => ({ subject: `Bilan du retour et facture · ${d.reference}`, heading: "L'inspection est terminée", paragraphs: ["Voici le bilan de votre retour. Votre facture est en pièce jointe.", ...(d.breakdown ?? [])], rows: rows(d, f, LABELS.fr, ["fees", "caution", "invoice", "netToPay", "bankRows"]), cta: "Voir le bilan" }),
  rental_settled: (d, f) => ({ subject: `Location soldée, merci · ${d.reference}`, heading: "Merci pour votre confiance", paragraphs: ["Votre location est entièrement réglée.", ...(d.points ? [`Vous avez gagné ${d.points} points de fidélité.`] : [])], rows: rows(d, f, LABELS.fr, []), cta: "Voir mon espace" }),
  cancelled: (d, f) => ({ subject: `Annulation · ${d.reference}`, heading: "Votre réservation est annulée", paragraphs: [d.reason ? `Motif : ${d.reason}` : "Votre demande a été annulée.", ...(d.invoice ? ["Votre avoir est en pièce jointe."] : [])], rows: rows(d, f, LABELS.fr, ["invoice"]), cta: "Nous contacter" }),
  password_reset: (d) => ({ subject: "Réinitialisez votre mot de passe", heading: "Choisissez un nouveau mot de passe", paragraphs: [`Notre équipe vous envoie ce lien à votre demande. Il est valable ${d.expiresIn ?? 60} minutes et ne sert qu'une fois. Si vous n'avez rien demandé, ignorez ce message.`], rows: [], cta: "Choisir un nouveau mot de passe" }),
  staff_notice: (d, f) => ({ subject: `${d.event ?? "Activité"} · ${d.reference}`, heading: d.event ?? "Activité", paragraphs: [d.name], rows: rows(d, f, LABELS.fr, ["amount", "method", "total", "deposit", "dueAt"]), cta: "Ouvrir la demande" }),
};

const en: Record<EmailKind, Build> = {
  request_received: (d, f) => ({ subject: `Request received · ${d.reference}`, heading: "We've received your request", paragraphs: ["Our team is checking availability and will send you an official quote in dinars very soon."], rows: rows(d, f, LABELS.en, ["dates"]), cta: "Track my request" }),
  quote_sent: (d, f) => ({ subject: `Your quote · ${d.reference}`, heading: "Your quote is ready", paragraphs: ["It's attached. Accept it online to reserve your pieces: the booking is confirmed once we receive the deposit."], rows: rows(d, f, LABELS.en, ["total", "validUntil"]), cta: "View and accept the quote" }),
  quote_reminder: (d, f) => ({ subject: `Your quote expires soon · ${d.reference}`, heading: "Your quote expires soon", paragraphs: ["After this date, the pieces will no longer be reserved for you."], rows: rows(d, f, LABELS.en, ["total", "validUntil"]), cta: "View and accept the quote" }),
  quote_accepted: (d, f) => ({ subject: `Quote accepted, deposit due · ${d.reference}`, heading: "Thank you, your quote is accepted", paragraphs: ["Your deposit invoice is attached. Your booking will be confirmed as soon as we receive the deposit."], rows: rows(d, f, LABELS.en, ["total", "deposit", "dueAt", "bankRows"]), cta: "Track my booking" }),
  deposit_reminder: (d, f) => ({ subject: `Reminder: deposit due · ${d.reference}`, heading: "Your deposit is nearly due", paragraphs: ["To keep your pieces reserved, please pay the deposit before the date below."], rows: rows(d, f, LABELS.en, ["deposit", "dueAt", "bankRows"]), cta: "Track my booking" }),
  deposit_overdue: (d, f) => ({ subject: `Deposit overdue · ${d.reference}`, heading: "We haven't received your deposit yet", paragraphs: ["The due date has passed. If you've already paid, ignore this message or send us your proof of payment. Otherwise, write to us so we can hold your dates."], rows: rows(d, f, LABELS.en, ["deposit", "dueAt", "bankRows"]), cta: "Track my booking" }),
  payment_received: (d, f) => ({ subject: `Payment received · ${d.reference}`, heading: "We've received your payment", paragraphs: ["Thank you. Your receipt is attached."], rows: rows(d, f, LABELS.en, ["amount", "method", "remaining"]), cta: "Track my booking" }),
  booking_confirmed: (d, f) => ({ subject: `Booking confirmed · ${d.reference}`, heading: "Your booking is confirmed", paragraphs: ["Your pieces are reserved. Our team will be in touch to arrange delivery."], rows: rows(d, f, LABELS.en, ["dates", "remaining"]), cta: "View my booking" }),
  dispatched: (d, f) => ({ subject: `Delivered · ${d.reference}`, heading: "Your pieces have been delivered", paragraphs: ["Enjoy your event! We'll collect the equipment as agreed."], rows: rows(d, f, LABELS.en, ["dates"]), cta: "View my booking" }),
  return_received: (d, f) => ({ subject: `Return received · ${d.reference}`, heading: "We've collected the equipment", paragraphs: ["Our team is inspecting it piece by piece. You'll receive the return report once the inspection is done."], rows: rows(d, f, LABELS.en, []), cta: "Track my booking" }),
  inspection_closed: (d, f) => ({ subject: `Return report and invoice · ${d.reference}`, heading: "The inspection is finished", paragraphs: ["Here is your return report. Your invoice is attached.", ...(d.breakdown ?? [])], rows: rows(d, f, LABELS.en, ["fees", "caution", "invoice", "netToPay", "bankRows"]), cta: "View the report" }),
  rental_settled: (d, f) => ({ subject: `Hire settled, thank you · ${d.reference}`, heading: "Thank you for your trust", paragraphs: ["Your hire is fully paid.", ...(d.points ? [`You've earned ${d.points} loyalty points.`] : [])], rows: rows(d, f, LABELS.en, []), cta: "View my account" }),
  cancelled: (d, f) => ({ subject: `Cancellation · ${d.reference}`, heading: "Your booking is cancelled", paragraphs: [d.reason ? `Reason: ${d.reason}` : "Your request has been cancelled.", ...(d.invoice ? ["Your credit note is attached."] : [])], rows: rows(d, f, LABELS.en, ["invoice"]), cta: "Contact us" }),
  password_reset: (d) => ({ subject: "Reset your password", heading: "Choose a new password", paragraphs: [`Our team is sending you this link at your request. It lasts ${d.expiresIn ?? 60} minutes and works once. If you didn't ask for it, ignore this message.`], rows: [], cta: "Choose a new password" }),
  staff_notice: (d, f) => ({ subject: `${d.event ?? "Activity"} · ${d.reference}`, heading: d.event ?? "Activity", paragraphs: [d.name], rows: rows(d, f, LABELS.en, ["amount", "method", "total", "deposit", "dueAt"]), cta: "Open the request" }),
};

const ar: Record<EmailKind, Build> = {
  request_received: (d, f) => ({ subject: `تم استلام الطلب · ${d.reference}`, heading: "لقد استلمنا طلبكم", paragraphs: ["يتحقق فريقنا من التوفر وسيرسل لكم عرض سعر رسميًا بالدينار قريبًا جدًا."], rows: rows(d, f, LABELS.ar, ["dates"]), cta: "متابعة طلبي" }),
  quote_sent: (d, f) => ({ subject: `عرض السعر · ${d.reference}`, heading: "عرض السعر جاهز", paragraphs: ["تجدونه مرفقًا. اقبلوه عبر الإنترنت لحجز قطعكم: يتأكد الحجز بعد استلام العربون."], rows: rows(d, f, LABELS.ar, ["total", "validUntil"]), cta: "عرض وقبول العرض" }),
  quote_reminder: (d, f) => ({ subject: `عرض السعر ينتهي قريبًا · ${d.reference}`, heading: "عرض السعر ينتهي قريبًا", paragraphs: ["بعد هذا التاريخ لن تبقى القطع محجوزة لكم."], rows: rows(d, f, LABELS.ar, ["total", "validUntil"]), cta: "عرض وقبول العرض" }),
  quote_accepted: (d, f) => ({ subject: `تم قبول العرض، العربون مستحق · ${d.reference}`, heading: "شكرًا، تم قبول عرض السعر", paragraphs: ["فاتورة العربون مرفقة. سيتأكد حجزكم فور استلام العربون."], rows: rows(d, f, LABELS.ar, ["total", "deposit", "dueAt", "bankRows"]), cta: "متابعة حجزي" }),
  deposit_reminder: (d, f) => ({ subject: `تذكير: العربون مستحق · ${d.reference}`, heading: "موعد دفع العربون يقترب", paragraphs: ["للإبقاء على حجز قطعكم، يرجى دفع العربون قبل التاريخ المذكور."], rows: rows(d, f, LABELS.ar, ["deposit", "dueAt", "bankRows"]), cta: "متابعة حجزي" }),
  deposit_overdue: (d, f) => ({ subject: `تأخر دفع العربون · ${d.reference}`, heading: "لم نستلم العربون بعد", paragraphs: ["انقضى الموعد. إذا كنتم قد دفعتم، تجاهلوا هذه الرسالة أو أرسلوا لنا إثبات الدفع. وإلا فراسلونا لنحتفظ بتواريخكم."], rows: rows(d, f, LABELS.ar, ["deposit", "dueAt", "bankRows"]), cta: "متابعة حجزي" }),
  payment_received: (d, f) => ({ subject: `تم استلام الدفع · ${d.reference}`, heading: "لقد استلمنا دفعتكم", paragraphs: ["شكرًا. الوصل مرفق."], rows: rows(d, f, LABELS.ar, ["amount", "method", "remaining"]), cta: "متابعة حجزي" }),
  booking_confirmed: (d, f) => ({ subject: `تم تأكيد الحجز · ${d.reference}`, heading: "تم تأكيد حجزكم", paragraphs: ["قطعكم محجوزة. سيتصل بكم فريقنا لتنظيم التوصيل."], rows: rows(d, f, LABELS.ar, ["dates", "remaining"]), cta: "عرض حجزي" }),
  dispatched: (d, f) => ({ subject: `تم التوصيل · ${d.reference}`, heading: "تم توصيل قطعكم", paragraphs: ["مناسبة سعيدة! سنستعيد المعدات كما اتفقنا."], rows: rows(d, f, LABELS.ar, ["dates"]), cta: "عرض حجزي" }),
  return_received: (d, f) => ({ subject: `تم استلام المعدات · ${d.reference}`, heading: "لقد استعدنا المعدات", paragraphs: ["يفحصها فريقنا قطعة بقطعة. ستصلكم حصيلة الإرجاع فور انتهاء الفحص."], rows: rows(d, f, LABELS.ar, []), cta: "متابعة حجزي" }),
  inspection_closed: (d, f) => ({ subject: `حصيلة الإرجاع والفاتورة · ${d.reference}`, heading: "انتهى الفحص", paragraphs: ["هذه حصيلة الإرجاع. فاتورتكم مرفقة.", ...(d.breakdown ?? [])], rows: rows(d, f, LABELS.ar, ["fees", "caution", "invoice", "netToPay", "bankRows"]), cta: "عرض الحصيلة" }),
  rental_settled: (d, f) => ({ subject: `تمت تسوية الكراء، شكرًا · ${d.reference}`, heading: "شكرًا على ثقتكم", paragraphs: ["تم دفع كرائكم بالكامل.", ...(d.points ? [`لقد ربحتم ${d.points} نقطة وفاء.`] : [])], rows: rows(d, f, LABELS.ar, []), cta: "عرض فضائي" }),
  cancelled: (d, f) => ({ subject: `إلغاء · ${d.reference}`, heading: "تم إلغاء حجزكم", paragraphs: [d.reason ? `السبب: ${d.reason}` : "تم إلغاء طلبكم.", ...(d.invoice ? ["الإشعار الدائن مرفق."] : [])], rows: rows(d, f, LABELS.ar, ["invoice"]), cta: "اتصلوا بنا" }),
  password_reset: (d) => ({ subject: "إعادة تعيين كلمة المرور", heading: "اختاروا كلمة مرور جديدة", paragraphs: [`يرسل لكم فريقنا هذا الرابط بناء على طلبكم. صالح لمدة ${d.expiresIn ?? 60} دقيقة ولمرة واحدة. إذا لم تطلبوه فتجاهلوا هذه الرسالة.`], rows: [], cta: "اختيار كلمة مرور جديدة" }),
  staff_notice: (d, f) => ({ subject: `${d.event ?? "نشاط"} · ${d.reference}`, heading: d.event ?? "نشاط", paragraphs: [d.name], rows: rows(d, f, LABELS.ar, ["amount", "method", "total", "deposit", "dueAt"]), cta: "فتح الطلب" }),
};

const COPY: Record<Language, Record<EmailKind, Build>> = { fr, en, ar };

export function emailContent(kind: EmailKind, lang: Language, data: EmailData): EmailContent {
  return COPY[lang][kind](data, {
    money: (v) => formatTND(v, lang),
    day: (iso) => formatDay(iso.slice(0, 10), lang, { day: "numeric", month: "long", year: "numeric" }),
    time: (iso) => formatDateTime(iso, lang),
  });
}

export const emailLabels = (lang: Language) => LABELS[lang];
