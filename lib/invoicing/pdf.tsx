import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { BRAND_NAME, COMPANY_NAME } from "@/lib/brand";
import { formatDay, formatTND } from "@/lib/utils/formatters";
import type { QuoteSnapshot } from "@/lib/types";
import type { InvoiceLine, InvoiceSnapshot } from "./types";

// Documents are always A4, light and printable, in French or English. The stored PDF of an
// issued number is the legal document: it is rendered once and never again (lib/invoicing/store.ts).

const fonts = path.join(process.cwd(), "lib/invoicing/fonts");
Font.register({
  family: "InterTight",
  fonts: [
    { src: path.join(fonts, "InterTight-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fonts, "InterTight-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fonts, "InterTight-Bold.ttf"), fontWeight: 700 },
  ],
});
// A client's name can be in Arabic even on a French document.
Font.register({
  family: "PlexArabic",
  fonts: [
    { src: path.join(fonts, "IBMPlexSansArabic-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fonts, "IBMPlexSansArabic-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const INK = "#2b1d13";
const SOFT = "#6f5a4a";
const LINE = "#e9dccd";
const PAPER = "#f7f1ea";

const s = StyleSheet.create({
  page: { fontFamily: ["InterTight", "PlexArabic"], fontSize: 9.5, color: INK, paddingTop: 42, paddingHorizontal: 42, paddingBottom: 60, lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: LINE },
  brand: { fontSize: 19, fontWeight: 700, letterSpacing: -0.4 },
  by: { fontSize: 9, color: SOFT },
  logo: { height: 34, marginBottom: 6, objectFit: "contain" },
  title: { fontSize: 19, fontWeight: 700, textAlign: "right", letterSpacing: -0.4 },
  docMeta: { textAlign: "right", color: SOFT, marginTop: 2 },
  parties: { flexDirection: "row", gap: 24, marginTop: 18 },
  party: { flex: 1 },
  label: { fontSize: 7.5, fontWeight: 600, color: SOFT, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  strong: { fontWeight: 600 },
  table: { marginTop: 20 },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: LINE },
  head: { borderBottomWidth: 1, borderBottomColor: INK, paddingVertical: 5 },
  cLabel: { flex: 1, paddingRight: 8 },
  cQty: { width: 34, textAlign: "right" },
  cUnit: { width: 66, textAlign: "right" },
  cVat: { width: 36, textAlign: "right" },
  cAmount: { width: 72, textAlign: "right" },
  th: { fontSize: 7.5, fontWeight: 600, color: SOFT, textTransform: "uppercase", letterSpacing: 0.6 },
  sub: { fontSize: 8, color: SOFT },
  bottom: { flexDirection: "row", gap: 24, marginTop: 16 },
  left: { flex: 1 },
  totals: { width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 5, paddingTop: 6, borderTopWidth: 1, borderTopColor: INK, fontSize: 11.5, fontWeight: 700 },
  vatTable: { backgroundColor: PAPER, borderRadius: 6, padding: 8, marginBottom: 8 },
  vatRow: { flexDirection: "row", paddingVertical: 1.5 },
  vatCell: { flex: 1, textAlign: "right" },
  words: { marginTop: 14, padding: 8, backgroundColor: PAPER, borderRadius: 6 },
  pay: { marginTop: 12 },
  footer: { position: "absolute", left: 42, right: 42, bottom: 26, flexDirection: "row", justifyContent: "space-between", gap: 16, fontSize: 7.5, color: SOFT },
});

type Lang = "fr" | "en";
const COPY = {
  fr: {
    deposit: "Facture d'acompte", final: "Facture", credit_note: "Avoir", number: "N°", issued: "Émise le", due: "Échéance", ref: "Référence",
    seller: "Émetteur", buyer: "Client", mf: "Matricule fiscal", rne: "RNE", designation: "Désignation", qty: "Qté", unit: "P.U.", vat: "TVA", amount: "Montant TTC",
    ht: "Total HT", tva: "TVA", ttc: "Total TTC", stamp: "Droit de timbre", due_total: "Total à payer", rate: "Taux", base: "Base HT", tax: "TVA",
    deposits: "Acompte(s) facturé(s)", paid: "Déjà réglé", net: "Net à payer", credit: "Trop-perçu", caution: "Caution retenue (frais de remise en état)",
    words: "Arrêtée la présente facture à la somme de :", wordsCredit: "Arrêté le présent avoir à la somme de :", payTitle: "Règlement", bank: "Banque", rib: "RIB", iban: "IBAN", mention: "À mentionner", page: "Page",
    cancels: "Annule partiellement ou totalement la facture", reason: "Motif", quote: "Devis", proforma: "Facture proforma", validUntil: "Valable jusqu'au", event: "Événement", nights: "nuits",
    notInvoice: "Ce document n'est pas une facture.", receipt: "Reçu de paiement", received: "Reçu le", method: "Mode", remaining: "Reste à payer", paidAmount: "Montant reçu",
    by: `par ${COMPANY_NAME}`,
  },
  en: {
    deposit: "Deposit invoice", final: "Invoice", credit_note: "Credit note", number: "No.", issued: "Issued on", due: "Due", ref: "Reference",
    seller: "From", buyer: "Client", mf: "Tax ID", rne: "RNE", designation: "Description", qty: "Qty", unit: "Unit", vat: "VAT", amount: "Amount incl. VAT",
    ht: "Total excl. VAT", tva: "VAT", ttc: "Total incl. VAT", stamp: "Stamp duty", due_total: "Total due", rate: "Rate", base: "Base", tax: "VAT",
    deposits: "Deposit invoice(s)", paid: "Already paid", net: "Net to pay", credit: "Overpaid", caution: "Security deposit kept (repair costs)",
    words: "This invoice amounts to:", wordsCredit: "This credit note amounts to:", payTitle: "Payment", bank: "Bank", rib: "RIB", iban: "IBAN", mention: "Reference to quote", page: "Page",
    cancels: "Credits in part or in full invoice", reason: "Reason", quote: "Quote", proforma: "Pro forma invoice", validUntil: "Valid until", event: "Event", nights: "nights",
    notInvoice: "This document is not an invoice.", receipt: "Payment receipt", received: "Received on", method: "Method", remaining: "Still to pay", paidAmount: "Amount received",
    by: `by ${COMPANY_NAME}`,
  },
} as const;

const money = (v: number, lang: Lang) => formatTND(v, lang);
const day = (iso: string, lang: Lang) => formatDay(iso.slice(0, 10), lang, { day: "numeric", month: "long", year: "numeric" });
const label = (l: InvoiceLine, lang: Lang) => (lang === "en" && l.label_en) || l.label_fr || l.label || "";
const sellerLines = (v: InvoiceSnapshot["seller"], lang: Lang) => [
  [v.address, [v.postal_code, v.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  [v.phone, v.email].filter(Boolean).join(" · "),
  `${COPY[lang].mf} : ${v.tax_id}`,
  v.rne ? `${COPY[lang].rne} : ${v.rne}` : "",
].filter(Boolean);

function Footer({ text, lang }: { text: string; lang: Lang }) {
  return (
    <View style={s.footer} fixed>
      <Text style={{ flex: 1 }}>{text}</Text>
      <Text render={({ pageNumber, totalPages }) => `${COPY[lang].page} ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Brand({ logo, lang }: { logo?: string | null; lang: Lang }) {
  return (
    <View>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- PDF image, no alt attribute exists */}
      {logo ? <Image src={logo} style={s.logo} /> : null}
      <Text style={s.brand}>{BRAND_NAME}</Text>
      <Text style={s.by}>{COPY[lang].by}</Text>
    </View>
  );
}

function TotalRow({ label: l, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <View style={s.totalRow}><Text style={bold ? s.strong : undefined}>{l}</Text><Text style={bold ? s.strong : undefined}>{value}</Text></View>;
}

function InvoiceDocument({ i, logo }: { i: InvoiceSnapshot; logo?: string | null }) {
  const lang = i.language;
  const c = COPY[lang];
  const m = (v: number) => money(v, lang);
  const finalInvoice = i.type === "final";
  const showTable = i.lines.some((l) => l.unit_price != null || l.quantity);
  return (
    <Document title={i.number} author={COMPANY_NAME} creator={BRAND_NAME} producer={BRAND_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Brand logo={logo} lang={lang} />
          <View>
            <Text style={s.title}>{c[i.type]}</Text>
            <Text style={[s.docMeta, s.strong]}>{c.number} {i.number}</Text>
            <Text style={s.docMeta}>{c.issued} {day(i.issued_at, lang)}</Text>
            {i.due_at ? <Text style={s.docMeta}>{c.due} {day(i.due_at, lang)}</Text> : null}
            <Text style={s.docMeta}>{c.ref} {i.reference}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>{c.seller}</Text>
            <Text style={s.strong}>{[i.seller.legal_name, i.seller.legal_form].filter(Boolean).join(" ")}</Text>
            {sellerLines(i.seller, lang).map((l) => <Text key={l}>{l}</Text>)}
          </View>
          <View style={s.party}>
            <Text style={s.label}>{c.buyer}</Text>
            <Text style={s.strong}>{i.buyer.company || i.buyer.name}</Text>
            {i.buyer.company ? <Text>{i.buyer.name}</Text> : null}
            {i.buyer.address ? <Text>{i.buyer.address}</Text> : null}
            <Text>{[i.buyer.phone, i.buyer.email].filter(Boolean).join(" · ")}</Text>
            {i.buyer.tax_id ? <Text>{c.mf} : {i.buyer.tax_id}</Text> : null}
          </View>
        </View>

        {i.cancels ? <Text style={{ marginTop: 12 }}>{c.cancels} {i.cancels}{i.reason ? ` · ${c.reason} : ${i.reason}` : ""}</Text> : null}

        {showTable && (
          <View style={s.table}>
            <View style={[s.row, s.head]} fixed>
              <Text style={[s.cLabel, s.th]}>{c.designation}</Text>
              <Text style={[s.cQty, s.th]}>{c.qty}</Text>
              <Text style={[s.cUnit, s.th]}>{c.unit}</Text>
              <Text style={[s.cVat, s.th]}>{c.vat}</Text>
              <Text style={[s.cAmount, s.th]}>{c.amount}</Text>
            </View>
            {i.lines.map((l, n) => (
              <View key={n} style={s.row} wrap={false}>
                <View style={s.cLabel}>
                  <Text>{label(l, lang)}</Text>
                  {l.nights ? <Text style={s.sub}>{l.nights} {c.nights}{l.discount_percent ? ` · −${l.discount_percent} %` : ""}</Text> : null}
                </View>
                <Text style={s.cQty}>{l.quantity ?? 1}</Text>
                <Text style={s.cUnit}>{l.unit_price != null ? m(l.unit_price) : ""}</Text>
                <Text style={s.cVat}>{l.vat_rate != null ? `${l.vat_rate} %` : ""}</Text>
                <Text style={s.cAmount}>{m(l.ttc)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.bottom} wrap={false}>
          <View style={s.left}>
            <View style={s.vatTable}>
              <View style={s.vatRow}>
                <Text style={[s.vatCell, s.th, { textAlign: "left" }]}>{c.rate}</Text>
                <Text style={[s.vatCell, s.th]}>{c.base}</Text>
                <Text style={[s.vatCell, s.th]}>{c.tax}</Text>
              </View>
              {i.by_rate.map((r) => (
                <View key={r.rate} style={s.vatRow}>
                  <Text style={[s.vatCell, { textAlign: "left" }]}>{r.rate} %</Text>
                  <Text style={s.vatCell}>{m(r.ht)}</Text>
                  <Text style={s.vatCell}>{m(r.tva)}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.totals}>
            {finalInvoice && i.gross ? (
              <>
                <TotalRow label={c.ht} value={m(i.gross.ht)} />
                <TotalRow label={c.tva} value={m(i.gross.tva)} />
                <TotalRow label={c.ttc} value={m(i.gross.ttc)} />
                {(i.deductions ?? []).map((d) => <TotalRow key={d.number} label={`${c.deposits} : ${d.number}`} value={`− ${m(d.ttc)}`} />)}
              </>
            ) : (
              <>
                <TotalRow label={c.ht} value={m(i.totals.ht)} />
                <TotalRow label={c.tva} value={m(i.totals.tva)} />
                <TotalRow label={c.ttc} value={m(i.totals.ttc)} />
              </>
            )}
            {i.totals.stamp > 0 ? <TotalRow label={c.stamp} value={m(i.totals.stamp)} /> : null}
            <View style={s.grand}><Text>{c.due_total}</Text><Text>{m(i.totals.total_due)}</Text></View>
            {finalInvoice ? (
              <View style={{ marginTop: 5 }}>
                {i.caution_retained ? <TotalRow label={c.caution} value={`− ${m(i.caution_retained)}`} /> : null}
                {i.paid ? <TotalRow label={c.paid} value={`− ${m(i.paid)}`} /> : null}
                <TotalRow bold label={(i.net_to_pay ?? 0) < 0 ? c.credit : c.net} value={m(Math.abs(i.net_to_pay ?? 0))} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.words} wrap={false}>
          <Text style={s.sub}>{i.type === "credit_note" ? c.wordsCredit : c.words}</Text>
          <Text style={s.strong}>{i.amount_words}</Text>
        </View>

        {i.type !== "credit_note" && (i.payment_terms.rib || i.payment_terms.iban) ? (
          <View style={s.pay} wrap={false}>
            <Text style={s.label}>{c.payTitle}</Text>
            {i.payment_terms.bank_name ? <Text>{c.bank} : {i.payment_terms.bank_name}</Text> : null}
            {i.payment_terms.rib ? <Text>{c.rib} : {i.payment_terms.rib}</Text> : null}
            {i.payment_terms.iban ? <Text>{c.iban} : {i.payment_terms.iban}</Text> : null}
            <Text>{c.mention} : {i.number}</Text>
          </View>
        ) : null}

        <Footer text={[i.legal_mentions, `${[i.seller.legal_name, i.seller.legal_form].filter(Boolean).join(" ")} · ${c.mf} ${i.seller.tax_id}`].filter(Boolean).join(" · ")} lang={lang} />
      </Page>
    </Document>
  );
}

export const renderInvoicePdf = (snapshot: InvoiceSnapshot, logo?: string | null) => renderToBuffer(<InvoiceDocument i={snapshot} logo={logo} />);

type Seller = InvoiceSnapshot["seller"];

function QuoteDocumentPdf({ q, seller, lang }: { q: QuoteSnapshot; seller: Seller; lang: Lang }) {
  const c = COPY[lang];
  const m = (v: number) => money(v, lang);
  const rows = [
    ...q.lines.map((l) => ({ key: l.line_id, label: (lang === "en" && l.title_en) || l.title_fr, sub: `${formatDay(l.start_date, lang)} – ${formatDay(l.end_date, lang)} · ${l.nights} ${c.nights}`, qty: l.quantity, unit: l.unit_price, vat: l.vat_rate, ttc: l.ttc ?? l.line_total })),
    ...(q.extras ?? []).map((e) => ({ key: e.extra_id, label: e.label, sub: "", qty: e.quantity, unit: e.unit_price, vat: e.vat_rate, ttc: e.ttc })),
  ];
  return (
    <Document title={`${q.reference} R${q.revision}`} author={COMPANY_NAME} creator={BRAND_NAME} producer={BRAND_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Brand lang={lang} />
          <View>
            <Text style={s.title}>{c.quote}</Text>
            <Text style={[s.docMeta, s.strong]}>{q.reference} · R{q.revision}</Text>
            <Text style={s.docMeta}>{c.issued} {day(q.issued_at, lang)}</Text>
            <Text style={s.docMeta}>{c.validUntil} {day(q.valid_until, lang)}</Text>
          </View>
        </View>
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>{c.seller}</Text>
            <Text style={s.strong}>{[seller.legal_name || COMPANY_NAME, seller.legal_form].filter(Boolean).join(" ")}</Text>
            {seller.tax_id ? sellerLines(seller, lang).map((l) => <Text key={l}>{l}</Text>) : null}
          </View>
          <View style={s.party}>
            <Text style={s.label}>{c.buyer}</Text>
            <Text style={s.strong}>{q.customer.company || q.customer.name}</Text>
            {q.customer.company ? <Text>{q.customer.name}</Text> : null}
            <Text>{[q.customer.phone, q.customer.email].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>
        <View style={s.table}>
          <View style={[s.row, s.head]} fixed>
            <Text style={[s.cLabel, s.th]}>{c.designation}</Text>
            <Text style={[s.cQty, s.th]}>{c.qty}</Text>
            <Text style={[s.cUnit, s.th]}>{c.unit}</Text>
            <Text style={[s.cVat, s.th]}>{c.vat}</Text>
            <Text style={[s.cAmount, s.th]}>{c.amount}</Text>
          </View>
          {rows.map((r) => (
            <View key={r.key} style={s.row} wrap={false}>
              <View style={s.cLabel}><Text>{r.label}</Text>{r.sub ? <Text style={s.sub}>{r.sub}</Text> : null}</View>
              <Text style={s.cQty}>{r.qty}</Text>
              <Text style={s.cUnit}>{m(r.unit)}</Text>
              <Text style={s.cVat}>{r.vat != null ? `${r.vat} %` : ""}</Text>
              <Text style={s.cAmount}>{m(r.ttc)}</Text>
            </View>
          ))}
        </View>
        <View style={s.bottom} wrap={false}>
          <View style={s.left} />
          <View style={s.totals}>
            {q.totals ? <><TotalRow label={c.ht} value={m(q.totals.ht)} /><TotalRow label={c.tva} value={m(q.totals.tva)} /></> : null}
            <View style={s.grand}><Text>{c.ttc}</Text><Text>{m(q.total)}</Text></View>
          </View>
        </View>
        <Footer text={c.notInvoice} lang={lang} />
      </Page>
    </Document>
  );
}

export const renderQuotePdf = (q: QuoteSnapshot, seller: Seller, lang: Lang) => renderToBuffer(<QuoteDocumentPdf q={q} seller={seller} lang={lang} />);

export interface Receipt {
  reference: string; customer: string; amount: number; kind: string; method: string; receivedAt: string; paymentRef: string | null; remaining: number; seller: Seller;
}

function ReceiptDocument({ r, lang }: { r: Receipt; lang: Lang }) {
  const c = COPY[lang];
  const m = (v: number) => money(v, lang);
  return (
    <Document title={`${c.receipt} ${r.reference}`} author={COMPANY_NAME} creator={BRAND_NAME} producer={BRAND_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Brand lang={lang} />
          <View>
            <Text style={s.title}>{c.receipt}</Text>
            <Text style={[s.docMeta, s.strong]}>{r.reference}</Text>
            <Text style={s.docMeta}>{c.received} {day(r.receivedAt, lang)}</Text>
          </View>
        </View>
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>{c.seller}</Text>
            <Text style={s.strong}>{[r.seller.legal_name || COMPANY_NAME, r.seller.legal_form].filter(Boolean).join(" ")}</Text>
            {r.seller.tax_id ? sellerLines(r.seller, lang).map((l) => <Text key={l}>{l}</Text>) : null}
          </View>
          <View style={s.party}><Text style={s.label}>{c.buyer}</Text><Text style={s.strong}>{r.customer}</Text></View>
        </View>
        <View style={[s.totals, { marginTop: 24 }]}>
          <TotalRow label={c.method} value={r.method} />
          {r.paymentRef ? <TotalRow label={c.ref} value={r.paymentRef} /> : null}
          <View style={s.grand}><Text>{c.paidAmount}</Text><Text>{m(r.amount)}</Text></View>
          <TotalRow label={c.remaining} value={m(r.remaining)} />
        </View>
        <Footer text={c.notInvoice} lang={lang} />
      </Page>
    </Document>
  );
}

export const renderReceiptPdf = (r: Receipt, lang: Lang) => renderToBuffer(<ReceiptDocument r={r} lang={lang} />);
