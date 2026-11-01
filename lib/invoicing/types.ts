// What public.write_invoice freezes into invoices.snapshot.
export type InvoiceType = "deposit" | "final" | "credit_note";

export interface InvoiceRate { rate: number; ht: number; tva: number; ttc: number }

export interface InvoiceLine {
  label_fr?: string;
  label_en?: string | null;
  label?: string;
  quantity?: number;
  nights?: number;
  unit_price?: number | null;
  discount_percent?: number | null;
  vat_rate?: number | null;
  ht: number;
  tva: number;
  ttc: number;
}

export interface InvoiceSnapshot {
  type: InvoiceType;
  number: string;
  language: "fr" | "en";
  issued_at: string;
  due_at: string | null;
  reference: string;
  seller: {
    legal_name: string; legal_form: string | null; address: string | null; city: string | null; postal_code: string | null;
    tax_id: string; rne: string | null; phone: string | null; email: string | null; bank_name: string | null; rib: string | null; iban: string | null;
  };
  buyer: { name: string; company: string | null; email: string; phone: string; address: string | null; tax_id: string | null };
  event: { type: string | null; venue: string | null; guests: number | null };
  lines: InvoiceLine[];
  by_rate: InvoiceRate[];
  own_by_rate: InvoiceRate[];
  totals: { ht: number; tva: number; ttc: number; stamp: number; total_due: number };
  /** Final invoices: the full amounts before deposits are taken off. */
  gross?: { ht: number; tva: number; ttc: number };
  /** Final invoices: deposit invoices already billed. */
  deductions?: { number: string; ttc: number }[];
  paid?: number;
  /** Caution kept to settle damage fees. */
  caution_retained?: number;
  net_to_pay?: number;
  amount_words: string;
  legal_mentions: string | null;
  payment_terms: { due_at: string | null; bank_name: string | null; rib: string | null; iban: string | null };
  quote?: { id: string; revision: number };
  reason?: string;
  cancels?: string;
}
