import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, user } from "./harness";

let db: PGlite;
let client: string, manager: string;
const ip = "a".repeat(64);
const ask = async (identifier: string, hash = ip) => (await as(db, null, (tx) => tx.query<{ r: boolean }>("select public.request_password_help($1, $2) as r", [identifier, hash]))).rows[0].r;
const tickets = async () => (await db.query<{ profile_id: string; channel: string; subject: string }>("select profile_id, channel, subject from public.messages where subject like 'Demande de réinitialisation%'")).rows;

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "fatma@example.com");
  manager = await user(db, "m@example.com", "manager");
  await db.query("update public.profiles set phone = '+216 23 040 424' where id = $1", [client]);
});
beforeEach(async () => {
  await db.query("delete from private.rate_limits");
  await db.query("delete from public.messages");
});

describe("a forgotten password", () => {
  it("answers the same for a known and an unknown phone", async () => {
    expect(await ask("23 040 424")).toBe(false);
    expect(await ask("99 999 999")).toBe(false);
  });

  it("opens a ticket for a known phone only, linked to the profile, written for staff", async () => {
    await ask("0021623040424");
    await ask("99 999 999");
    expect(await tickets()).toEqual([{ profile_id: client, channel: "whatsapp", subject: "Demande de réinitialisation du mot de passe" }]);
    expect((await as(db, manager, (tx) => tx.query("select 1 from public.messages"))).rows).toHaveLength(1);
  });

  it("keeps one open ticket per client", async () => {
    await ask("23040424");
    await ask("+216 23 040 424");
    expect(await tickets()).toHaveLength(1);
  });

  it("answers the same for a known and an unknown email", async () => {
    expect(await ask("fatma@example.com")).toBe(true);
    expect(await ask("nobody@example.com")).toBe(true);
    expect(await tickets()).toHaveLength(0);
  });

  it("limits each identifier and each address", async () => {
    for (let i = 0; i < 3; i++) expect(await ask("fatma@example.com")).toBe(true);
    expect(await ask("fatma@example.com")).toBe(false);
    for (let i = 0; i < 6; i++) await ask(`user${i}@example.com`);
    expect(await ask("another@example.com")).toBe(false); // this address has made 10
    expect(await ask("another@example.com", "b".repeat(64))).toBe(true);
  });

  it("ignores nonsense", async () => {
    expect(await ask("x")).toBe(false);
    expect(await ask("fatma@example.com", "short")).toBe(false);
  });
});
