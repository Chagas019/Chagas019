import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin Studio", template: "%s · Admin Studio" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="container-lab pb-24 pt-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:pt-10">
      <aside className="mb-8 lg:mb-0">
        <div className="lg:sticky lg:top-[96px]">
          <div className="mb-4 hidden lg:block">
            <p className="display text-3xl">
              Admin <span className="text-signal">Studio</span>
            </p>
            <p className="lab-label mt-3 truncate text-smoke" title={admin.email}>
              {admin.email}
            </p>
          </div>
          <p className="lab-label mb-3 text-signal lg:hidden">Admin Studio</p>
          <div className="lg:border-t hairline">
            <AdminNav />
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
