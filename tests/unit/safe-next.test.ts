import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));

const { safeNext } = await import("@/lib/auth");

describe("safeNext (post-login and email-link redirects)", () => {
  it.each(["/account", "/admin/requests?status=submitted", "/catalogue/kasaya-curved-sofa"])("keeps same-site path %s", (p) => {
    expect(safeNext(p)).toBe(p);
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "/%0d%0aLocation:x\r\n", "", null, 42])(
    "rejects %s",
    (p) => {
      expect(safeNext(p, "/account")).toBe("/account");
    },
  );
});
