import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UploadDropzone } from "@/components/files/UploadDropzone";
import { FileTable } from "@/components/files/FileTable";

export const metadata = { title: "Files — SpendWise" };

export default async function FilesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const files = await db.uploadedFile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalFilename: true,
      fileSize: true,
      uploadStatus: true,
      parsedTransactionCount: true,
      parseError: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload bank transaction CSV files to get started.
        </p>
      </div>

      <UploadDropzone />

      <div>
        <h2 className="mb-3 text-base font-medium">Uploaded files</h2>
        <FileTable files={files} />
      </div>
    </div>
  );
}
