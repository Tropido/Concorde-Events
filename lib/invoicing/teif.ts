import type { InvoiceSnapshot } from "./types";

/** TEIF, the XML format Tunisia TradeNet (TTN) expects for electronic invoices. Not built: it needs
 *  the TTN specification, credentials and a recognised signing certificate. Until then staff
 *  submit through their own TTN access and record the outcome on the invoice. The snapshot holds
 *  every field the conversion will need. */
export const toTeif: (snapshot: InvoiceSnapshot) => string = () => {
  throw new Error("not_implemented");
};
