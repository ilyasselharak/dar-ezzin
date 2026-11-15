import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { requireStaffPage } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Admin Dar Ezzin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaffPage();
  const pendingOrders = await db.order.count({ where: { status: "PENDING" } });
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: (user.role as string) ?? "STAFF" }} pendingOrders={pendingOrders}>
      {children}
    </AdminShell>
  );
}
