import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata = { title: "Settings — SpendWise" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, mfaEnabledAt: true, createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account information.
        </p>
      </div>
      <SettingsForm
        email={user.email}
        mfaEnabled={!!user.mfaEnabledAt}
        createdAt={user.createdAt.toISOString()}
      />
    </div>
  );
}
