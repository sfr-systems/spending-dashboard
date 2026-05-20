import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seedDefaultRules } from "@/lib/seedDefaults";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await seedDefaultRules(session.user.id);
  return NextResponse.json({ ok: true, ...result });
}
