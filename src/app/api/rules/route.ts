import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_TYPES = new Set(["recategorize", "exclude", "rename"]);
const VALID_FIELDS = new Set(["description", "cleanedDescription", "any"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rules = await db.transactionRule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      type: r.type,
      matchField: r.matchField,
      phrase: r.phrase,
      targetCategory: r.targetCategory,
      hidden: r.hidden,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type?: unknown;
    matchField?: unknown;
    phrase?: unknown;
    targetCategory?: unknown;
    hidden?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type : "";
  const matchField = typeof body.matchField === "string" ? body.matchField : "any";
  const phrase = typeof body.phrase === "string" ? body.phrase.trim() : "";
  const targetCategory =
    typeof body.targetCategory === "string" ? body.targetCategory.trim() : "";

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid rule type" }, { status: 400 });
  }
  if (!VALID_FIELDS.has(matchField)) {
    return NextResponse.json({ error: "Invalid match field" }, { status: 400 });
  }
  if (!phrase) {
    return NextResponse.json({ error: "Phrase is required" }, { status: 400 });
  }
  if (phrase.length > 200) {
    return NextResponse.json({ error: "Phrase is too long" }, { status: 400 });
  }
  if (type === "recategorize" && !targetCategory) {
    return NextResponse.json(
      { error: "Smart Category is required for recategorize rules" },
      { status: 400 },
    );
  }
  if (type === "rename" && !targetCategory) {
    return NextResponse.json(
      { error: "Cleaned Name is required for rename rules" },
      { status: 400 },
    );
  }
  if (type === "rename" && targetCategory.length > 200) {
    return NextResponse.json({ error: "Cleaned Name is too long" }, { status: 400 });
  }

  const hidden = body.hidden === true;

  const created = await db.transactionRule.create({
    data: {
      userId: session.user.id,
      type,
      matchField,
      phrase,
      targetCategory: type === "exclude" ? null : targetCategory,
      hidden,
    },
  });

  return NextResponse.json({
    rule: {
      id: created.id,
      type: created.type,
      matchField: created.matchField,
      phrase: created.phrase,
      targetCategory: created.targetCategory,
      hidden: created.hidden,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
