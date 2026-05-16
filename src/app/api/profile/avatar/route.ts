import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_DATA_URL_BYTES = 300 * 1024; // 300 KB after base64 encoding
const ALLOWED_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarDataUrl: true },
  });

  return NextResponse.json({ avatarDataUrl: user?.avatarDataUrl ?? null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { avatarDataUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { avatarDataUrl } = body;

  if (typeof avatarDataUrl !== "string") {
    return NextResponse.json({ error: "avatarDataUrl is required" }, { status: 400 });
  }

  if (!ALLOWED_PREFIXES.some((p) => avatarDataUrl.startsWith(p))) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
  }

  if (Buffer.byteLength(avatarDataUrl, "utf8") > MAX_DATA_URL_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 300 KB)" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarDataUrl },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarDataUrl: null },
  });

  return NextResponse.json({ ok: true });
}
