import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { syncItem } from "@/lib/plaid/sync";
import { verifyPlaidWebhook } from "@/lib/plaid/webhook-verify";

type PlaidWebhookPayload = {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string; error_message?: string } | null;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const verification = await verifyPlaidWebhook(
    req.headers.get("plaid-verification"),
    rawBody,
  );
  if (!verification.ok) {
    return NextResponse.json(
      { error: "Invalid webhook signature", reason: verification.reason },
      { status: 401 },
    );
  }

  let payload: PlaidWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PlaidWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { webhook_type, webhook_code, item_id } = payload;

  // No item_id → nothing to route on. Acknowledge so Plaid stops retrying.
  if (!item_id) {
    return NextResponse.json({ received: true });
  }

  const item = await db.plaidItem.findUnique({
    where: { plaidItemId: item_id },
    include: { accounts: true },
  });
  if (!item) {
    // Unknown item — acknowledge to prevent retry storms.
    return NextResponse.json({ received: true });
  }

  // Handle synchronously only the bookkeeping updates that must be durable.
  // Defer the actual transactions/sync call to `after()` so we respond 200
  // quickly — Plaid retries non-2xx responses.

  if (webhook_type === "TRANSACTIONS" && webhook_code === "SYNC_UPDATES_AVAILABLE") {
    after(async () => {
      try {
        await syncItem(item);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Webhook sync failed";
        await db.plaidItem.update({
          where: { id: item.id },
          data: { lastSyncError: msg, status: "error" },
        });
      }
    });
    return NextResponse.json({ received: true });
  }

  if (webhook_type === "ITEM") {
    if (
      webhook_code === "ERROR" ||
      webhook_code === "PENDING_EXPIRATION" ||
      webhook_code === "PENDING_DISCONNECT" ||
      webhook_code === "USER_PERMISSION_REVOKED"
    ) {
      const errorMessage =
        payload.error?.error_message ??
        (webhook_code === "USER_PERMISSION_REVOKED"
          ? "Access revoked at the bank. Reconnect to resume syncing."
          : webhook_code === "PENDING_EXPIRATION" || webhook_code === "PENDING_DISCONNECT"
            ? "Bank connection is expiring soon. Reconnect to keep syncing."
            : "Bank connection error. Reconnect to resume syncing.");
      await db.plaidItem.update({
        where: { id: item.id },
        data: { status: "error", lastSyncError: errorMessage },
      });
      return NextResponse.json({ received: true });
    }
    if (webhook_code === "NEW_ACCOUNTS_AVAILABLE") {
      // Surface a soft notice; the next user-initiated link update would add
      // the account. For MVP we just log it via lastSyncError-style field.
      await db.plaidItem.update({
        where: { id: item.id },
        data: { lastSyncError: "New accounts are available at the bank. Reconnect to add them." },
      });
      return NextResponse.json({ received: true });
    }
  }

  // Unknown event — ack to avoid retries.
  return NextResponse.json({ received: true });
}
