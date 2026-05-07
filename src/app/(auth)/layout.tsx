import { TrendingUp } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-xl font-semibold tracking-tight">SpendWise</span>
      </div>
      {children}
    </div>
  );
}
