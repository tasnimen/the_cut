import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ROUTES } from "@/config/routes";
import { connection } from "next/server";

export const metadata = {
  title: "Reset password | The Cut Barbershop",
  description: "Choose a new password.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }) {
  await connection();
  const { token, error } = await searchParams;
  const validToken = !error && typeof token === "string" && /^[A-Za-z0-9_-]{8,256}$/.test(token) ? token : null;
  return (
    <>
      <SiteHeader activePath={ROUTES.signIn} variant="flow" />
      <main className="auth-page page-shell">
        <ResetPasswordForm token={validToken} />
      </main>
      <SiteFooter />
    </>
  );
}
