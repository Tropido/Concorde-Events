import { expect, test, type Page } from "@playwright/test";
import { cleanupUsers, enabled, isoDate, login, makeUser, pickDay, run, service } from "./helpers";

// The whole order pipeline on the TEST project, through the screens. Orders run on a throwaway
// product, because a damaged unit leaves stock for good. Issued invoices and payments are immutable,
// so they stay behind, and so do the users linked to them; the product is retired and the company
// settings put back.
test.skip(!enabled, "needs .env.local + .env.test.local for the TEST Supabase project");

const LEGAL = { legal_name: "Concorde Events E2E", tax_id: "0000000/A/M/000", rib: "12345678901234567890", bank_name: "Banque E2E" };
const PRODUCT = `Pièce commande E2E ${run}`;
let productId = "";
let company: Record<string, unknown> | null = null;

test.beforeAll(async () => {
  if (!enabled) return;
  const { data: settings } = await service.from("company_settings").select("legal_name, tax_id, rib, bank_name").single();
  company = settings;
  await service.from("company_settings").update(LEGAL).eq("id", true);

  const { data, error } = await service.from("products").insert({ slug: `e2e-orders-${run}`, title_fr: PRODUCT, status: "active" }).select("id").single();
  if (error) throw error;
  productId = data.id;
  const stock = await service.from("product_stock").insert({ product_id: productId, country: "TN", quantity_owned: 10 });
  const prices = await service.from("product_prices").insert([
    { product_id: productId, country: "TN", tier: "retail", amount: 100 },
    { product_id: productId, country: "TN", tier: "pro", amount: 80 },
  ]);
  if (stock.error || prices.error) throw stock.error ?? prices.error;
});

test.afterAll(async () => {
  if (!enabled) return;
  if (company) await service.from("company_settings").update(company).eq("id", true);
  if (productId) await service.from("products").update({ status: "retired" }).eq("id", productId);
  await cleanupUsers();
});

/** One unit of the test product for three nights, sent as a request. */
async function sendRequest(page: Page, guest?: { name: string; email: string }) {
  await page.goto("/catalogue");
  await page.getByRole("button", { name: `Choisir les dates: ${PRODUCT}` }).click();
  const dialog = page.getByRole("dialog");
  await pickDay(dialog, isoDate(40));
  await pickDay(dialog, isoDate(43));
  await dialog.getByRole("button", { name: /^ajouter/i }).click();
  await page.goto("/demande");
  if (guest) {
    await page.getByLabel("Nom complet").fill(guest.name);
    await page.getByLabel("Téléphone (WhatsApp)").fill("+216 22 000 000");
    await page.getByLabel("E-mail").fill(guest.email);
  }
  await page.getByRole("button", { name: "Mariage" }).click();
  await page.getByRole("button", { name: /envoyer ma demande/i }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText(/CE-\d{4}-\d{5}/);
  return (await status.textContent())!.match(/CE-\d{4}-\d{5}/)![0];
}

async function issueQuote(m: Page, reference: string) {
  await m.goto("/admin/requests");
  await m.getByRole("link", { name: reference }).click();
  await m.getByRole("button", { name: /émettre le devis/i }).click();
  await expect(m.getByRole("status")).toContainText(/enregistré/i);
}

async function acceptQuote(page: Page, signer: string) {
  await page.getByRole("button", { name: /accepter le devis/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog.getByLabel("Votre nom complet").fill(signer);
  await dialog.getByRole("button", { name: /j'accepte le devis/i }).click();
  await expect(dialog).toBeHidden();
}

const requestRow = async (reference: string) =>
  (await service.from("rental_requests").select("id, status, payment_status, deposit_required").eq("reference", reference).single()).data!;

async function recordPayment(m: Page, kind: "Acompte" | "Solde", amount: number) {
  await m.reload();
  await m.getByRole("button", { name: /enregistrer un paiement/i }).click();
  const sheet = m.getByRole("dialog");
  await sheet.getByLabel("Type").selectOption({ label: kind });
  await sheet.getByLabel("Montant (DT)").fill(String(amount));
  await sheet.getByRole("button", { name: "Enregistrer" }).click();
  await expect(sheet).toBeHidden();
}

/** Delivery, reception, then the single unit moved from "all good" to "damaged" with a fee. */
async function returnWithDamage(m: Page, fee: number) {
  m.on("dialog", (d) => d.accept());
  await m.reload();
  await m.getByRole("button", { name: /marquer comme livrée/i }).click();
  await m.getByRole("button", { name: /^retour$/i }).click();
  await m.getByRole("button", { name: /confirmer la réception/i }).click();
  await expect(m.getByRole("heading", { name: "Inspection", exact: true })).toBeVisible();
  await m.getByRole("group", { name: /^Tout est bon/ }).getByRole("button", { name: /diminuer/i }).click();
  await m.getByRole("group", { name: /^Endommagé/ }).getByRole("button", { name: /augmenter/i }).click();
  await m.getByLabel(/frais de remise en état/i).fill(String(fee));
  await m.getByRole("button", { name: /clôturer l'inspection/i }).click();
  await expect(m.getByRole("heading", { name: /bilan du retour/i })).toBeVisible();
}

const netToPay = async (requestId: string) => {
  const { data } = await service.from("invoices").select("snapshot").eq("request_id", requestId).eq("type", "final").single();
  return (data!.snapshot as { net_to_pay: number }).net_to_pay;
};

test("a guest order from request to settled", async ({ browser }) => {
  test.setTimeout(300_000);
  const manager = await makeUser("orders", "manager");

  const g = await browser.newPage();
  const reference = await sendRequest(g, { name: "Invité E2E", email: `guest-${run}@it.concorde.test` });
  const link = g.getByRole("link", { name: /suivre ma demande/i });
  await expect(link).toHaveAttribute("href", /^\/suivi\//);
  const tracking = (await link.getAttribute("href"))!;

  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await issueQuote(m, reference);

  // The guest accepts through their private link, with no account.
  await g.goto(tracking);
  await acceptQuote(g, "Invité E2E");
  const accepted = await requestRow(reference);
  expect(accepted).toMatchObject({ status: "accepted", payment_status: "deposit_due", deposit_required: 150 });
  const { data: deposit } = await service.from("invoices").select("number, type").eq("request_id", accepted.id).single();
  expect(deposit).toMatchObject({ type: "deposit", number: expect.stringMatching(/^F-\d{4}-\d{5}$/) });

  // Half received: the order confirms itself and the client is told, or would be with a key.
  await recordPayment(m, "Acompte", 150);
  await expect.poll(async () => (await requestRow(reference)).status).toBe("confirmed");
  const emails = async () => (await service.from("email_events").select("kind, status").eq("request_id", accepted.id)).data ?? [];
  await expect.poll(async () => (await emails()).map((e) => e.kind)).toContain("payment_received");
  if (!process.env.RESEND_API_KEY) expect(new Set((await emails()).map((e) => e.status))).toEqual(new Set(["skipped"]));

  await returnWithDamage(m, 100);
  expect((await requestRow(reference)).status).toBe("completed");
  const { data: final } = await service.from("invoices").select("snapshot").eq("request_id", accepted.id).eq("type", "final").single();
  const fee = (final!.snapshot as { lines: { label_fr: string; ttc: number }[] }).lines.at(-1)!;
  expect(fee.ttc).toBe(100);
  expect(fee.label_fr).toContain("Remise en état");

  await recordPayment(m, "Solde", await netToPay(accepted.id));
  await expect.poll(async () => (await requestRow(reference)).payment_status).toBe("paid");

  // The guest sees the report and can open the invoice through the same link.
  await g.goto(tracking);
  await expect(g.getByRole("heading", { name: /bilan du retour/i })).toBeVisible();
  const href = await g.getByRole("link", { name: /voir la facture finale/i }).getAttribute("href");
  const pdf = await g.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("an unknown tracking link says nothing", async ({ page }) => {
  await page.goto(`/suivi/${"x".repeat(43)}`);
  await expect(page.getByRole("heading", { name: /lien introuvable/i })).toBeVisible();
});

test("a professional earns points once the rental is completed and paid", async ({ browser }) => {
  test.setTimeout(300_000);
  const pro = await makeUser("orderpro", "professional");
  const manager = await makeUser("orderstaff", "manager");
  const p = await browser.newPage();
  await login(p, pro.email, pro.password);
  const reference = await sendRequest(p);

  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await issueQuote(m, reference);

  await p.goto("/account");
  await p.getByRole("link", { name: /accepter le devis/i }).first().click();
  await acceptQuote(p, "E2E orderpro");

  const row = await requestRow(reference);
  await recordPayment(m, "Acompte", Number(row.deposit_required));
  await expect.poll(async () => (await requestRow(reference)).status).toBe("confirmed");
  await returnWithDamage(m, 50);

  const points = async () => (await service.from("reward_events").select("points").eq("request_id", row.id).maybeSingle()).data?.points ?? 0;
  expect(await points()).toBe(0);
  await recordPayment(m, "Solde", await netToPay(row.id));
  await expect.poll(points).toBeGreaterThan(0);
});

test("staff create a label from the + chip and it stays", async ({ browser }) => {
  const manager = await makeUser("tags", "manager");
  const client = await makeUser("tagged");
  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await m.goto(`/admin/clients?view=customers&q=${encodeURIComponent(client.email)}`);
  await m.getByRole("button", { name: /E2E tagged/ }).first().click();
  await m.getByRole("button", { name: "Ajouter une étiquette" }).click();
  const label = `Fidèle ${run}`;
  await m.getByPlaceholder("Chercher ou créer…").fill(label);
  await m.getByPlaceholder("Chercher ou créer…").press("Enter");
  await expect(m.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await service.from("client_tag_links").select("tag_id").eq("profile_id", client.id)).data?.length).toBe(1);
  await m.reload();
  await expect(m.getByText(label).first()).toBeVisible();
});

test("staff send a reset link by email, and only a masked trace stays", async ({ browser }) => {
  const manager = await makeUser("resetter", "manager");
  const client = await makeUser("resetme");
  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await m.goto(`/admin/clients?view=customers&q=${encodeURIComponent(client.email)}`);
  await m.getByRole("button", { name: /E2E resetme/ }).first().click();
  await m.getByRole("button", { name: /réinitialiser le mot de passe/i }).click();
  const dialog = m.getByRole("dialog");
  await dialog.getByRole("button", { name: /envoyer le lien/i }).click();
  await expect(dialog.getByRole("status")).toContainText(/lien envoyé/i);

  const { data: audit } = await service.from("admin_audit").select("actor, channel, masked_destination").eq("target_profile", client.id).eq("action", "password_reset_link");
  expect(audit).toEqual([{ actor: manager.id, channel: "email", masked_destination: expect.stringMatching(/^r\*\*\*@/) }]);
  const { data: mail } = await service.from("email_events").select("payload").eq("profile_id", client.id).eq("kind", "password_reset").single();
  expect(JSON.stringify(mail)).not.toContain("token_hash");
});

test("the language switch moves the site to English and back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: /browse by category/i })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "FR", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});
