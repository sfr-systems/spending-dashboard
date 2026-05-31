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

  let body: { amount?: unknown; paymentDate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const paymentDateStr = typeof body.paymentDate === "string" ? body.paymentDate : "";
  const paymentDate = new Date(paymentDateStr);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (Number.isNaN(paymentDate.getTime())) {
    return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
  }

  const loan = await db.loan.findUnique({ where: { userId } });
  if (!loan) {
    return NextResponse.json({ error: "No active loan" }, { status: 404 });
  }

  const payment = await db.loanPayment.create({
    data: { loanId: loan.id, userId, amount, paymentDate },
  });

  return NextResponse.json({ ok: true, id: payment.id });
}
