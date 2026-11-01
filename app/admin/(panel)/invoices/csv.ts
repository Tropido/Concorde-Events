import type { InvoiceListRow } from "./ttn-table";

const cell = (v: string | number | null | undefined) => {
  const s = String(v ?? "");
  // A leading =, +, - or @ would run as a formula in a spreadsheet, and client names are free text.
  // Amounts are the one thing allowed to start with a minus.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const amount = (v: number) => Number(v).toFixed(3);

/** Semicolons and a BOM, so French Excel opens it directly. Credit notes are negative. */
export function invoicesCsv(rows: InvoiceListRow[]) {
  const rates = [...new Set(rows.flatMap((r) => r.invoice_rates.map((x) => Number(x.rate))))].sort((a, b) => a - b);
  const head = ["Numero", "Date", "Type", "Client", "Matricule fiscal", ...rates.flatMap((x) => [`HT ${x}%`, `TVA ${x}%`]), "Timbre", "TTC", "Paiement", "Statut TTN", "Reference TTN"];
  const lines = rows.map((r) => {
    const sign = r.type === "credit_note" ? -1 : 1;
    const of = (rate: number) => r.invoice_rates.find((x) => Number(x.rate) === rate);
    return [
      r.number, r.issued_at.slice(0, 10), r.type, r.rental_requests?.company_name ?? r.rental_requests?.customer_name, r.rental_requests?.billing_tax_id,
      ...rates.flatMap((x) => [amount(sign * Number(of(x)?.ht ?? 0)), amount(sign * Number(of(x)?.tva ?? 0))]),
      amount(sign * Number(r.stamp)), amount(sign * Number(r.ttc)), r.rental_requests?.payment_status, r.ttn_status, r.ttn_reference,
    ].map(cell).join(";");
  });
  return `﻿${[head.map(cell).join(";"), ...lines].join("\r\n")}\r\n`;
}
