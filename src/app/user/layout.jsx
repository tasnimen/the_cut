import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "My account | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  await requireDashboardAccess("user");
  return children;
}
