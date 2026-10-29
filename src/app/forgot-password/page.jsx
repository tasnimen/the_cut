import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ROUTES } from "@/config/routes";
import { redirectSignedInUserFromGuestPage } from "@/lib/auth/guest-page";

export const metadata = {
  title: "Forgot password | The Cut Barbershop",
  description: "Request a link to reset your password.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  await redirectSignedInUserFromGuestPage();
  return (
    <>
      <SiteHeader activePath={ROUTES.signIn} variant="flow" />
      <main className="auth-page page-shell">
        <ForgotPasswordForm />
      </main>
      <SiteFooter />
    </>
  );
}
