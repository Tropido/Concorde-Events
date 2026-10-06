import { requireStaff } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/types";
import { AdminSidebar } from "@/components/admin/ui";

// Operational interface: own sidebar, no marketing navbar/footer/loading animation.
// Every page below calls requireStaff() again for its own permission.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff(STAFF_ROLES);
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-[#fcf8f4] dark:bg-[#120e0b]">
      <AdminSidebar role={viewer.role} name={viewer.fullName ?? viewer.email} />
      <main id="main" className="flex-1 min-w-0 p-4 sm:p-8 space-y-6">{children}</main>
    </div>
  );
}
