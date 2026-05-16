import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pref = await db.userPreference.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(pref?.data ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let patch: Prisma.JsonObject;
  try {
    patch = await req.json() as Prisma.JsonObject;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await db.userPreference.findUnique({ where: { userId } });
  const current = (existing?.data as Prisma.JsonObject) ?? {};
  const updated: Prisma.JsonObject = { ...current, ...patch };

  await db.userPreference.upsert({
    where: { userId },
    create: { userId, data: updated },
    update: { data: updated },
  });

  return NextResponse.json({ ok: true });
}
