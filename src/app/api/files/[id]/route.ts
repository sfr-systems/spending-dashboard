import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await db.uploadedFile.findUnique({
    where: { id: params.id },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from disk (non-fatal if already missing)
  const filePath = path.join(process.cwd(), "uploads", file.userId, file.storedFilename);
  try {
    await unlink(filePath);
  } catch {
    // File may already be gone; continue with DB cleanup
  }

  // Cascade in schema handles Transaction deletion
  await db.uploadedFile.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}
