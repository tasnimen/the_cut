import { AuthPanel } from "@/features/auth/components/AuthPanel";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ROUTES } from "@/config/routes";
import { redirectSignedInUserFromGuestPage } from "@/lib/auth/guest-page";

export const metadata = {
  title: "Create account | The Cut Barbershop",
  description: "Create an account at The Cut Barbershop.",
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  await redirectSignedInUserFromGuestPage();
  return (
    <>
      <SiteHeader activePath={ROUTES.signUp} variant="flow" />
      <main className="auth-page page-shell">
        <AuthPanel mode="sign-up" />
      </main>
      <SiteFooter />
    </>
  );
}
