import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaidClient } from "@/lib/plaid/client";
import { encryptAccessToken } from "@/lib/plaid/crypto";
import { CountryCode } from "plaid";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const publicToken = body?.publicToken;
  if (typeof publicToken !== "string" || !publicToken) {
    return NextResponse.json({ error: "publicToken required" }, { status: 400 });
  }

  try {
    const plaid = getPlaidClient();

    const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchange.data.access_token;
    const plaidItemId = exchange.data.item_id;

    const [itemResp, accountsResp] = await Promise.all([
      plaid.itemGet({ access_token: accessToken }),
      plaid.accountsGet({ access_token: accessToken }),
    ]);

    const institutionId = itemResp.data.item.institution_id ?? null;
    let institutionName = "Bank";
    if (institutionId) {
      try {
        const inst = await plaid.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        });
        institutionName = inst.data.institution.name;
      } catch {
        // Non-fatal; fall back to default name.
      }
    }

    const item = await db.plaidItem.create({
      data: {
        userId,
        plaidItemId,
        institutionId,
        institutionName,
        accessTokenCiphertext: encryptAccessToken(accessToken),
        accounts: {
          create: accountsResp.data.accounts.map((a) => ({
            plaidAccountId: a.account_id,
            name: a.name,
            officialName: a.official_name ?? null,
            mask: a.mask ?? null,
            type: a.type,
            subtype: a.subtype ?? null,
          })),
        },
      },
      include: { accounts: true },
    });

    return NextResponse.json({
      id: item.id,
      institutionName: item.institutionName,
      accountCount: item.accounts.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Exchange failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
