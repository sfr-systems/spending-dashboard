import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlaidClient } from "@/lib/plaid/client";
import { CountryCode, Products } from "plaid";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plaid = getPlaidClient();
    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
    const redirectUri = baseUrl ? `${baseUrl}/plaid/oauth-return` : undefined;
    const webhookUrl = baseUrl ? `${baseUrl}/api/plaid/webhook` : undefined;

    const resp = await plaid.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "SpendWise",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      transactions: { days_requested: 730 },
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      ...(webhookUrl ? { webhook: webhookUrl } : {}),
    });

    return NextResponse.json({ linkToken: resp.data.link_token });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create link token";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
