import { requireStaff } from "@/lib/auth";
import { getPrefs } from "@/lib/i18n/server";
import { loadOverview } from "@/lib/admin/overview";
import { OverviewView } from "./overview-view";

export default async function AdminOverviewPage() {
  const [viewer, prefs] = await Promise.all([requireStaff(), getPrefs()]);
  const data = await loadOverview(prefs.lang);
  return <OverviewView data={data} name={viewer.fullName ?? viewer.email} />;
}
