import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const excluded = (body as { excludedFromDashboard?: unknown })?.excludedFromDashboard;
  if (typeof excluded !== "boolean") {
    return NextResponse.json(
      { error: "excludedFromDashboard must be a boolean" },
      { status: 400 },
    );
  }

  const result = await db.transaction.updateMany({
    where: { id, userId: session.user.id },
    data: { excludedFromDashboard: excluded },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, excludedFromDashboard: excluded });
}
