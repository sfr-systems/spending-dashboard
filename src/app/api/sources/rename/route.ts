import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { originalName?: unknown; newName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { originalName, newName: rawNewName } = body;

  if (!originalName || typeof originalName !== "string") {
    return NextResponse.json({ error: "originalName is required" }, { status: 400 });
  }

  const newName = typeof rawNewName === "string" ? rawNewName.trim() : "";

  if (!newName) {
    return NextResponse.json({ error: "New name cannot be empty" }, { status: 400 });
  }
  if (newName !== newName.toUpperCase()) {
    return NextResponse.json({ error: "Source name must be uppercase" }, { status: 400 });
  }
  if (newName === originalName) {
    return NextResponse.json({ error: "New name is the same as the current name" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    // 1. Update cleanedDescription on all matching transactions for this user
    await tx.transaction.updateMany({
      where: { userId, cleanedDescription: originalName },
      data: { cleanedDescription: newName },
    });

    // 2. Update any existing overrides that previously resolved to originalName
    //    so chains like (raw → A) stay consistent when A is renamed to B.
    await tx.sourceNameOverride.updateMany({
      where: { userId, overrideName: originalName },
      data: { overrideName: newName },
    });

    // 3. Upsert the override for future uploads
    await tx.sourceNameOverride.upsert({
      where: { userId_originalName: { userId, originalName } },
      create: { userId, originalName, overrideName: newName },
      update: { overrideName: newName },
    });
  });

  return NextResponse.json({ ok: true });
}
