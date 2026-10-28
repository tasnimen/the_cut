import { AuthPanel } from "@/features/auth/components/AuthPanel";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ROUTES } from "@/config/routes";
import { redirectSignedInUserFromGuestPage } from "@/lib/auth/guest-page";

export const metadata = {
  title: "Sign in | The Cut Barbershop",
  description: "Sign in to your account at The Cut Barbershop.",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  await redirectSignedInUserFromGuestPage();
  return (
    <>
      <SiteHeader activePath={ROUTES.signIn} variant="flow" />
      <main className="auth-page page-shell">
        <AuthPanel mode="sign-in" />
      </main>
      <SiteFooter />
    </>
  );
}
