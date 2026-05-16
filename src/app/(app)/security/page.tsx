import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SecuritySettings } from "@/components/security/SecuritySettings";

export const metadata = { title: "Security — SpendWise" };

export default async function SecurityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account&apos;s two-factor authentication settings.
        </p>
      </div>
      <SecuritySettings />
    </div>
  );
}
