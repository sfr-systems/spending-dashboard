import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import path from "path";
import Busboy from "busboy";
import { Readable } from "stream";
import { parseCSVBuffer } from "@/lib/csv/parseCSV";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ParsedFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

function parseMultipart(req: NextRequest): Promise<ParsedFile> {
  return new Promise(async (resolve, reject) => {
    const contentType = req.headers.get("content-type") ?? "";
    const busboy = Busboy({ headers: { "content-type": contentType }, limits: { fileSize: MAX_FILE_SIZE + 1 } });
    let resolved = false;

    busboy.on("file", (_field, fileStream, info) => {
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      fileStream.on("end", () => {
        if (!resolved) {
          resolved = true;
          resolve({ buffer: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType });
        }
      });
      fileStream.on("error", reject);
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (!resolved) reject(new Error("No file in request"));
    });

    const body = await req.arrayBuffer();
    const readable = Readable.from(Buffer.from(body));
    readable.pipe(busboy);
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: ParsedFile;
  try {
    parsed = await parseMultipart(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid form data";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { buffer, filename: originalFilename, mimeType } = parsed;

  if (buffer.length > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const ext = path.extname(originalFilename).toLowerCase();
  if (ext !== ".csv") {
    return NextResponse.json({ error: "Only CSV files are allowed" }, { status: 400 });
  }

  // Sanity check: no binary null bytes in first 512 bytes
  const sample = buffer.slice(0, 512).toString("utf-8");
  if (/[\x00-\x08\x0E-\x1F]/.test(sample)) {
    return NextResponse.json({ error: "File does not appear to be a valid CSV" }, { status: 400 });
  }

  const userId = session.user.id;
  const timestamp = Date.now();
  const storedFilename = `${timestamp}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Create the file record with "processing" status
  let fileRecord: { id: string };
  try {
    fileRecord = await db.uploadedFile.create({
      data: {
        userId,
        originalFilename,
        storedFilename,
        fileSize: buffer.length,
        mimeType: mimeType || "text/csv",
        uploadStatus: "processing",
        rowCount: 0,
        parsedTransactionCount: 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }

  // Parse CSV and create transactions
  const result = parseCSVBuffer(buffer);

  if (result.error || result.transactions.length === 0) {
    const parseError = result.error ?? "No valid transactions found";
    await db.uploadedFile.update({
      where: { id: fileRecord.id },
      data: {
        uploadStatus: "error",
        rowCount: result.rowCount,
        parseError,
      },
    });
    return NextResponse.json({ id: fileRecord.id, parseError }, { status: 201 });
  }

  try {
    await db.transaction.createMany({
      data: result.transactions.map((t) => ({
        userId,
        fileId: fileRecord.id,
        transactionDate: t.transactionDate,
        postedDate: t.postedDate,
        description: t.description,
        merchant: t.merchant,
        amount: t.amount,
        category: t.category,
        transactionType: t.transactionType,
        accountName: t.accountName,
        notes: t.notes,
        rawData: t.rawData,
      })),
    });

    await db.uploadedFile.update({
      where: { id: fileRecord.id },
      data: {
        uploadStatus: "parsed",
        rowCount: result.rowCount,
        parsedTransactionCount: result.transactions.length,
      },
    });
  } catch {
    await db.uploadedFile.update({
      where: { id: fileRecord.id },
      data: { uploadStatus: "error", rowCount: result.rowCount },
    });
  }

  return NextResponse.json({ id: fileRecord.id }, { status: 201 });
}
