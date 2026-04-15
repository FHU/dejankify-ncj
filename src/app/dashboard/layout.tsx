import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getUserSessions } from "@/actions/sessions";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const sessions = await getUserSessions();

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      initialSessions={sessions}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}
