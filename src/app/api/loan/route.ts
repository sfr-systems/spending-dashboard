import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loan = await db.loan.findUnique({
    where: { userId: session.user.id },
    include: { payments: { orderBy: { paymentDate: "asc" } } },
  });

  if (!loan) return NextResponse.json({ loan: null });

  return NextResponse.json({
    loan: {
      id: loan.id,
      initialAmount: loan.initialAmount.toNumber(),
      startDate: loan.startDate.toISOString(),
      avgMonthlyCharge: loan.avgMonthlyCharge.toNumber(),
      payments: loan.payments.map((p) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        paymentDate: p.paymentDate.toISOString(),
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { initialAmount?: unknown; startDate?: unknown; avgMonthlyCharge?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const initialAmount = Number(body.initialAmount);
  const avgMonthlyCharge = Number(body.avgMonthlyCharge);
  const startDateStr = typeof body.startDate === "string" ? body.startDate : "";
  const startDate = new Date(startDateStr);

  if (!Number.isFinite(initialAmount) || initialAmount <= 0) {
    return NextResponse.json({ error: "Invalid initial amount" }, { status: 400 });
  }
  if (!Number.isFinite(avgMonthlyCharge) || avgMonthlyCharge < 0) {
    return NextResponse.json({ error: "Invalid average monthly charge" }, { status: 400 });
  }
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }

  const loan = await db.loan.upsert({
    where: { userId },
    create: { userId, initialAmount, startDate, avgMonthlyCharge },
    update: { initialAmount, startDate, avgMonthlyCharge },
  });

  return NextResponse.json({ ok: true, id: loan.id });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db.loan.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
