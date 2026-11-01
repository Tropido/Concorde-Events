import type { EmailKind } from "@/lib/email/copy";
import type { InvoiceType } from "@/lib/invoicing/types";
import type { InspectionCondition, LogisticsStatus, PaymentKind, PaymentMethod, PaymentStatus } from "@/lib/types";

export type AcceptError = "quote_superseded" | "quote_expired" | "terms_required" | "company_incomplete" | "not_found" | "generic";
export type EmailStatus = "queued" | "sent" | "failed" | "skipped";
export type TtnStatus = "not_sent" | "sent" | "accepted" | "rejected";
export type ExtraKind = "delivery" | "installation" | "collection" | "discount" | "other";

export interface OrderTranslations {
  paymentStatus: Record<PaymentStatus, string>;
  kinds: Record<PaymentKind, string>;
  methods: Record<PaymentMethod, string>;
  invoiceTypes: Record<InvoiceType, string>;

  viewDetails: string; acceptCta: string; acceptTitle: string; acceptIntro: string; acceptTotal: string; acceptDeposit: string;
  acceptDeadline: (hours: number) => string; acceptTerms: string; termsLink: string; signer: string; signerHint: string; acceptSubmit: string;
  acceptNoDeposit: string; errors: Record<AcceptError, string>; reaccept: string;
  summaryTitle: string; total: string; paid: string; remaining: string; depositProgress: string; totalProgress: string;
  payBefore: (date: string) => string; depositDone: string; instructionsTitle: string; bank: string; rib: string; iban: string; mention: string;
  instructionsEmpty: string; invoicesTitle: string; noInvoices: string; download: string; paymentsTitle: string; noPayments: string; piecesTitle: string;
  trackTitle: string; trackIntro: string; notFoundTitle: string; notFoundText: string; quoteLink: string; createAccount: string;
  termsTitle: string; termsPending: string; termsSections: { title: string; text: string }[]; extraLine: string;

  panel: {
    payments: string; record: string; kind: string; method: string; amount: string; amountShort: string; referenceShort: string; receivedAt: string; reference: string; proof: string; proofHint: string; note: string;
    date: string; recordedBy: string; voided: string; voidAction: string; voidPrompt: string; viewProof: string; empty: string; caution: string;
    depositProgress: string; totalProgress: string; deadline: string; timeLeft: (days: number, hours: number) => string; overdueBy: (days: number, hours: number) => string;
    overpaid: (amount: string) => string; waInstructions: (name: string, ref: string, amount: string, rib: string) => string;
    waReminder: (name: string, ref: string, amount: string, date: string) => string; waThanks: (name: string, ref: string) => string;
    waButtons: { instructions: string; reminder: string; thanks: string };
    markAccepted: string; signer: string; channel: string; channels: { whatsapp: string; phone: string; in_person: string };
    confirmWithoutDeposit: string; reasonPrompt: string; reason: string; cancelOrder: string; credit: string; creditHint: (max: string) => string; waived: (reason: string) => string;
    extras: string; extrasHint: string; extraKinds: Record<ExtraKind, string>; extraLabel: string; extraQty: string; extraPrice: string; extraVat: string; addExtra: string; removeExtra: string;
    billing: string; billingAddress: string; billingTaxId: string;
    invoices: string; emails: string; resend: string; noEmails: string; emailKinds: Record<EmailKind, string>; emailStatus: Record<EmailStatus, string>; attempts: (n: number) => string;
    reacceptNotice: string;
  };

  invoicesPage: {
    title: string; subtitle: string; type: string; month: string; allTypes: string; unpaid: string; allTtn: string; ttnStatus: Record<TtnStatus, string>; ttn: string;
    number: string; date: string; client: string; ht: string; tva: string; ttc: string; stamp: string; toPay: string; empty: string; monthTotals: string; export: string;
    markSent: string; ttnReference: string; selected: (n: number) => string; selectAll: string; ttnNote: string;
  };

  company: {
    title: string; hint: string; adminOnly: string; identity: string; bank: string; money: string; legalName: string; legalForm: string; address: string; city: string; postalCode: string;
    taxId: string; rne: string; phone: string; email: string; bankName: string; rib: string; iban: string; logo: string; pricesIncludeVat: string; pricesIncludeVatHint: string; defaultVat: string;
    stamp: string; depositRate: string; depositDeadline: string; dueDeposit: string; dueBalance: string; mentionsFr: string; mentionsEn: string; incomplete: string; openSettings: string;
    clientDepositRate: string; clientDepositHint: string;
  };

  inspection: {
    logistics: Record<LogisticsStatus, string>; conditions: Record<InspectionCondition, string>; chips: Record<InspectionCondition, (n: number) => string>;
    returnButton: string; receiveTitle: string; sent: string; received: string; allReceived: string; confirmReceive: string; inspectTitle: string; remainder: (n: number) => string;
    fee: string; feeReason: string; suggested: (amount: string) => string; note: string; photos: (n: number, max: number) => string; photosVisible: string; viewPhoto: string;
    cautionTitle: string; cautionOutcomes: Record<"refund" | "retain" | "none", string>; totalFees: string; saveDraft: string; close: string; closeConfirm: string;
    reportTitle: string; heads: Record<"sent" | "received" | InspectionCondition, string>; feesHead: string; finalInvoice: string;
    cautionResult: (outcome: "refund" | "retain" | "none", refunded: string, retained: string) => string;
    underInspection: string; none: string; age: (hours: number) => string; lateLabel: string; movements: string; movementsEmpty: string;
    reasons: Record<"touch_up" | "to_repair" | "to_write_off" | "lost" | "found" | "repaired" | "written_off", string>;
    repairFee: string; replacementValue: string; repairHint: string; found: string; foundPrompt: string;
  };

  reset: {
    title: string; channel: string; channels: { email: string; whatsapp: string }; destination: string; storedOnly: string; reason: string; confirmOther: (destination: string) => string;
    validity: (minutes: number) => string; send: string; sent: string; opened: string; openWhatsapp: string; waMessage: (name: string, link: string, minutes: number) => string;
  };

  kpi: { depositsPending: string; depositsCount: (n: number) => string; overdue: string; overdueNone: string; balances: string; balancesNone: string; dueOn: (date: string) => string };
  cms: { terms: string; termsHint: string };
}
