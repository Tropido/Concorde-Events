import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import { OPS_ROLES, STAFF_ROLES } from "@/lib/types";
import { AdminShell, type AdminCounts } from "@/components/admin/ui";

// Operational app: own shell, no storefront navbar/footer. Every page below calls
// requireStaff() again for its own permission.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff(STAFF_ROLES);
  let counts: AdminCounts = { requests: 0, inbox: 0, clients: 0, late: 0 };
  if (OPS_ROLES.includes(viewer.role)) {
    const db = await createClient();
    const [requests, inbox, clients, out] = await Promise.all([
      db.from("rental_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      db.from("messages").select("id", { count: "exact", head: true }).eq("status", "open"),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("rental_requests").select("request_lines(end_date)").eq("status", "dispatched"),
    ]);
    const today = todayIn("TN");
    const late = (out.data ?? []).filter((r) => (r.request_lines as { end_date: string }[]).some((l) => l.end_date < today)).length;
    counts = { requests: requests.count ?? 0, inbox: inbox.count ?? 0, clients: clients.count ?? 0, late };
  }
  return <AdminShell role={viewer.role} name={viewer.fullName ?? viewer.email} counts={counts}>{children}</AdminShell>;
}
