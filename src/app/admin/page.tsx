
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminLogoutButton from "@/components/admin/logout-button";
import OrdersDashboard from "@/components/admin/orders-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#F6F0E6] px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#68765A]">
              Bake and Bloom By Joe
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#49382D]">
              Admin dashboard
            </h1>
            <p className="mt-2 text-sm text-[#49382D]/70">
              Manage and review your bakery orders.
            </p>
          </div>

          <AdminLogoutButton />
        </header>

        <OrdersDashboard />
      </div>
    </main>
  );
}
