import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrefs } from "@/lib/i18n/server";
import { buildProStatus, TIER_COLUMNS, type ProAccountRow, type TierRow } from "@/lib/pro";
import { OPS_ROLES, STAFF_ROLES, type AppRole, type Viewer } from "@/lib/types";

/** Verified identity (getClaims checks the JWT) + trusted profile row. Once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, phone, vat_number, activity, city, website, role, status")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  let pro: Viewer["pro"] = null;
  if (p.role === "professional") {
    const [{ data: account }, { data: tiers }, prefs] = await Promise.all([
      supabase.from("pro_accounts").select("tier_code, tier_locked, points, custom_discount_percent, extra_benefits").eq("profile_id", id).maybeSingle(),
      supabase.from("pro_tiers").select(TIER_COLUMNS).order("rank"),
      getPrefs(),
    ]);
    if (account && tiers) pro = buildProStatus(account as ProAccountRow, tiers as TierRow[], prefs.lang);
  }
  return {
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    companyName: p.company_name,
    phone: p.phone,
    vatNumber: p.vat_number,
    activity: p.activity,
    city: p.city,
    website: p.website,
    role: p.role,
    status: p.status,
    pro,
  };
});

/** Same-site path only. Rejects "//host" and "/\host" (browsers treat both as another
 *  origin) and anything with control characters. */
export function safeNext(next: unknown, fallback = "/account") {
  return typeof next === "string" && /^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(next) ? next : fallback;
}

export async function requireViewer(next = "/account") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Page guard for /admin. Non-staff get a 404; staff without this permission go to /admin. */
export async function requireStaff(roles: AppRole[] = OPS_ROLES, next = "/admin") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  const staff = viewer.status === "approved" && STAFF_ROLES.includes(viewer.role);
  if (!staff) notFound();
  if (!roles.includes(viewer.role)) redirect(viewer.role === "editor" ? "/admin/cms" : "/admin");
  return viewer;
}

/** Server-action guard: actions are public POST endpoints, so check every time. */
export async function assertStaff(roles: AppRole[] = OPS_ROLES) {
  const viewer = await getViewer();
  if (!viewer || viewer.status !== "approved" || !roles.includes(viewer.role)) {
    throw new Error("forbidden");
  }
  return viewer;
}

/** Approved operations staff (manager/admin). */
export const isStaffViewer = (v: Viewer | null) => !!v && v.status === "approved" && OPS_ROLES.includes(v.role);
