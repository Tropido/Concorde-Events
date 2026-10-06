import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteDocument } from "@/components/quote/quote-document";
import { translations } from "@/lib/i18n/translations";
import type { QuoteSnapshot } from "@/lib/types";

const evil = `<script>alert(1)</script><img src=x onerror=alert(2)>`;

const snapshot: QuoteSnapshot = {
  reference: "CE-2026-00001",
  revision: 1,
  issued_at: "2026-10-06T10:00:00Z",
  valid_until: "2026-10-20",
  country: "FR",
  tier: "retail",
  source_currency: "EUR",
  currency: "TND",
  fx: { rate_eur_tnd: 3.364214, source: "provider", rate_time: "2026-10-06T00:02:31Z" },
  customer: { name: evil, email: `${evil}@x.io`, phone: evil, company: evil },
  notes: evil,
  lines: [
    {
      line_id: "l1", product_id: "p1", slug: "sofa", title_fr: evil, title_ar: null,
      quantity: 2, start_date: "2026-10-15", end_date: "2026-10-18", nights: 3,
      source_unit_price: 350, unit_price: 1177.475, line_total: 7064.85,
    },
  ],
  total: 7064.85,
};

describe("QuoteDocument", () => {
  const html = renderToStaticMarkup(<QuoteDocument snapshot={snapshot} lang="fr" t={translations.fr} />);

  it("renders untrusted fields as text, never as markup", () => {
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("shows the frozen amounts and rate from the snapshot", () => {
    expect(html).toContain("3.364214");
    expect(html.replace(/\s/g, " ")).toMatch(/7\s?064,850/);
  });

  it("labels the document as a quote, not an invoice", () => {
    expect(html).toContain(translations.fr.quote.notInvoice);
  });
});
