import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaidClient } from "@/lib/plaid/client";
import { decryptAccessToken } from "@/lib/plaid/crypto";

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await db.plaidItem.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Best-effort: tell Plaid to invalidate the access token so it can't be used again.
  try {
    const plaid = getPlaidClient();
    const accessToken = decryptAccessToken(item.accessTokenCiphertext);
    await plaid.itemRemove({ access_token: accessToken });
  } catch {
    // Continue — even if Plaid revoke fails, we still want to drop the local row.
  }

  await db.plaidItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
