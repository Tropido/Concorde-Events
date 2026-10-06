import { expect, test } from "@playwright/test";
import { cleanupUsers, enabled, isoDate, login, makeUser, run, service } from "./helpers";

test.skip(!enabled, "needs .env.local + .env.test.local for the TEST Supabase project");
test.describe.configure({ mode: "serial" });
test.afterAll(async () => {
  if (enabled) {
    await service.from("cms_content").delete().eq("locale", "fr");
    await cleanupUsers();
  }
});

test("request -> staff quote -> client sees it in another session", async ({ browser }) => {
  const client = await makeUser("client");
  const manager = await makeUser("manager", "manager");

  const c = await browser.newPage();
  await login(c, client.email, client.password);
  await c.goto("/catalogue");
  await c.getByRole("button", { name: /choisir dates/i }).first().click();
  const dialog = c.getByRole("dialog");
  await dialog.getByLabel("Début").fill(isoDate(30));
  await dialog.getByLabel("Fin (retour)").fill(isoDate(33));
  await expect(dialog.getByText(/disponible/)).toBeVisible();
  await dialog.getByRole("button", { name: /ajouter à ma demande/i }).click();
  await c.getByRole("button", { name: /envoyer ma demande/i }).click();
  await c.getByRole("button", { name: /enregistrer la demande/i }).click();
  const status = c.getByRole("status");
  await expect(status).toContainText(/CE-\d{4}-\d{5}/);
  const reference = (await status.textContent())!.match(/CE-\d{4}-\d{5}/)![0];
  // WhatsApp is a plain link (no popup), pointing at the business number with the reference.
  const wa = c.getByRole("link", { name: /continuer sur whatsapp/i });
  await expect(wa).toHaveAttribute("href", new RegExp(`^https://wa\\.me/21623040424\\?text=.*${reference}`));

  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await m.goto("/admin/requests");
  await m.getByRole("link", { name: reference }).click();
  await m.getByRole("button", { name: /émettre un devis/i }).click();
  await expect(m.getByRole("status")).toContainText(/enregistré/i);
  await m.reload();
  await expect(m.getByRole("link", { name: "R1" })).toBeVisible();

  await c.goto("/account");
  await c.reload();
  await expect(c.getByText(reference)).toBeVisible();
  await c.getByRole("link", { name: /voir le devis/i }).click();
  await expect(c.getByRole("heading", { name: /devis de location/i })).toBeVisible();
  await expect(c.getByText(reference)).toBeVisible();
});

test("contact enquiry reaches the staff inbox", async ({ browser }) => {
  const manager = await makeUser("inbox", "manager");
  const p = await browser.newPage();
  await p.goto("/contact");
  await p.getByLabel("Nom complet").fill("E2E Guest");
  await p.getByLabel("E-mail").fill(`guest-${run}@it.concorde.test`);
  await p.getByLabel("Objet").fill(`Mariage ${run}`);
  await p.getByLabel("Message").fill("Besoin de 40 chaises.");
  await p.getByRole("button", { name: /envoyer le message/i }).click();
  await expect(p.getByRole("status")).toContainText(/message envoyé/i);

  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await m.goto("/admin/inbox?channel=contact");
  await expect(m.getByText(`Mariage ${run}`)).toBeVisible();
});

test("CMS publish appears on the homepage", async ({ browser }) => {
  const editor = await makeUser("editor", "manager");
  const p = await browser.newPage();
  await login(p, editor.email, editor.password, "/admin/login");
  await p.goto("/admin/cms?locale=fr");
  await p.getByLabel("Titre", { exact: true }).fill(`Titre E2E ${run}`);
  await p.getByRole("button", { name: /publier/i }).click();
  await expect(p.getByRole("status")).toBeVisible();
  const home = await browser.newPage();
  await home.goto("/");
  await expect(home.getByRole("heading", { level: 1 })).toContainText(`Titre E2E ${run}`);
});

test("signup confirmation, password recovery and logout", async ({ page, baseURL }) => {
  const email = `signup-${run}@it.concorde.test`;
  const { data, error } = await service.auth.admin.generateLink({
    type: "signup", email, password: `Pw-${run}-initial`, options: { data: { full_name: "Signup E2E" } },
  });
  if (error) throw error;
  await page.goto(`${baseURL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=signup&next=/account`);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: /Signup E2E/ })).toBeVisible();
  await page.getByRole("button", { name: /se déconnecter/i }).first().click();
  // Sign-out revokes every session of the user: let it finish before starting recovery.
  await expect(page.getByRole("link", { name: /^connexion$/i }).first()).toBeVisible();

  const rec = await service.auth.admin.generateLink({ type: "recovery", email });
  if (rec.error) throw rec.error;
  await page.goto(`${baseURL}/auth/confirm?token_hash=${rec.data.properties.hashed_token}&type=recovery&next=/reset-password`);
  await page.getByLabel("Nouveau mot de passe").fill(`Pw-${run}-changed`);
  await page.getByLabel("Confirmer le mot de passe").fill(`Pw-${run}-changed`);
  await page.getByRole("button", { name: /mettre à jour/i }).click();
  await expect(page).toHaveURL(/\/account$/);
  const { data: user } = await service.from("profiles").select("id").eq("email", email).single();
  if (user) await service.auth.admin.deleteUser(user.id);
});

test("pro approval and suspension take effect immediately", async ({ browser }) => {
  const pro = await makeUser("pro");
  await service.from("profiles").update({ role: "professional", status: "pending" }).eq("id", pro.id);
  const manager = await makeUser("approver", "manager");

  const p = await browser.newPage();
  await login(p, pro.email, pro.password);
  await p.goto("/account");
  await expect(p.getByText(/en attente/i).first()).toBeVisible();

  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await m.goto("/admin/clients");
  const card = m.getByRole("listitem").filter({ hasText: pro.email });
  await card.getByRole("button", { name: /valider/i }).click();
  await p.goto("/account/tools");
  await expect(p.getByRole("heading", { name: /calculateur de marge/i })).toBeVisible();

  await m.goto("/admin/clients?view=all");
  m.once("dialog", (d) => d.accept());
  await m.getByRole("listitem").filter({ hasText: pro.email }).getByRole("button", { name: /suspendre/i }).click();
  await p.goto("/account");
  await expect(p.getByRole("heading", { name: /compte suspendu/i })).toBeVisible();
});

test("product photo upload persists after reload", async ({ browser }) => {
  const manager = await makeUser("uploader", "manager");
  const m = await browser.newPage();
  await login(m, manager.email, manager.password, "/admin/login");
  await m.goto("/admin/inventory/new");
  await m.getByLabel("Titre (FR)").fill(`Pièce E2E ${run}`);
  await m.getByLabel("Slug (URL)").fill(`e2e-${run}`);
  // 1x1 PNG
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await m.getByLabel(/ajouter des photos/i).setInputFiles({ name: "p.png", mimeType: "image/png", buffer: png });
  await expect(m.getByRole("button", { name: /retirer/i }).first()).toBeVisible();
  await m.getByRole("button", { name: /enregistrer la pièce/i }).click();
  await expect(m).toHaveURL(/\/admin\/inventory\/[0-9a-f-]{36}$/);
  await m.reload();
  await expect(m.getByRole("button", { name: /retirer/i }).first()).toBeVisible();
  await service.from("products").update({ status: "retired" }).eq("slug", `e2e-${run}`);
});
