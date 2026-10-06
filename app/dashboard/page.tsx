import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/types";

// Old links pointed at a single all-roles dashboard; send each user to their own area.
export default async function DashboardRedirect() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/account");
  redirect(viewer.status === "approved" && STAFF_ROLES.includes(viewer.role) ? "/admin" : "/account");
}
