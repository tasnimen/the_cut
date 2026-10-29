import { connection } from "next/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ROUTES } from "@/config/routes";
import { TwoFactorEnrol } from "@/features/auth/components/TwoFactorEnrol";
import { requireEnrolmentAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "Two-step verification | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function TwoFactorPage() {
  await connection();
  const principal = await requireEnrolmentAccess();
  return (
    <>
      <SiteHeader activePath={ROUTES.twoFactor} variant="flow" />
      <main className="auth-page page-shell">
        <TwoFactorEnrol role={principal.role} />
      </main>
      <SiteFooter />
    </>
  );
}
