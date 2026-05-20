import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";

const OWNER_EMAIL = "1rksnyder@gmail.com";
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — under Vercel's 4.5MB request cap
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured on the server." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo attached" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large (max 4 MB)" },
      { status: 413 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only image files are allowed" },
      { status: 415 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "photo";

  const senderEmail = session.user.email ?? "(unknown)";
  const senderName = session.user.firstName?.trim() || senderEmail;

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "SpendWise About <onboarding@resend.dev>",
      to: OWNER_EMAIL,
      subject: `SpendWise thank-you photo from ${senderName}`,
      text: `${senderName} (${senderEmail}) sent a thank-you photo via the About page.\nFilename: ${safeName}\nSize: ${file.size} bytes\nType: ${file.type}`,
      attachments: [
        {
          filename: safeName,
          content: bytes,
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
