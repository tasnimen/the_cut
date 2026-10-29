import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { PasswordForm, ProfileForm } from "@/features/dashboard/user/ProfileForms";
import { SessionList } from "@/features/dashboard/user/SessionList";
import { loadMySessions } from "@/lib/account/my-sessions";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = { title: "My profile | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function UserProfilePage() {
  const user = await requireDashboardAccess("user");
  const sessions = await loadMySessions();

  return (
    <>
      <PageHeader eyebrow="My account" title="My profile" description="Your details, password and the devices you are signed in on." />
      <Panel title="Your details"><ProfileForm name={user.name} email={user.email} /></Panel>
      <Panel title="Password"><PasswordForm /></Panel>
      <Panel title="Where you are signed in"><SessionList sessions={sessions} /></Panel>
    </>
  );
}
