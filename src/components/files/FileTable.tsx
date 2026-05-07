"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteFileDialog } from "./DeleteFileDialog";
import { formatFileSize, formatDate } from "@/lib/format";
import { Tooltip } from "@/components/ui/tooltip";

interface FileRow {
  id: string;
  originalFilename: string;
  fileSize: number;
  uploadStatus: string;
  parsedTransactionCount: number;
  parseError: string | null;
  createdAt: Date;
}

interface FileTableProps {
  files: FileRow[];
}

function StatusBadge({ status, parseError }: { status: string; parseError: string | null }) {
  if (status === "parsed") return <Badge variant="success">Parsed</Badge>;
  if (status === "error") {
    const badge = <Badge variant="destructive">Error</Badge>;
    return parseError ? (
      <Tooltip content={parseError}>{badge}</Tooltip>
    ) : badge;
  }
  if (status === "processing") return <Badge variant="warning">Processing</Badge>;
  return <Badge variant="secondary">Uploaded</Badge>;
}

export function FileTable({ files }: FileTableProps) {
  const [dialogState, setDialogState] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });

  if (files.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No files uploaded yet. Upload a CSV file to get started.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Filename</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                Uploaded
              </th>
              <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">
                Size
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell">
                Transactions
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium truncate max-w-[180px] md:max-w-xs">
                  {file.originalFilename}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {formatDate(file.createdAt)}
                </td>
                <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell">
                  {formatFileSize(file.fileSize)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={file.uploadStatus} parseError={file.parseError} />
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                  {file.parsedTransactionCount > 0 ? file.parsedTransactionCount.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${file.originalFilename}`}
                    onClick={() =>
                      setDialogState({ open: true, id: file.id, name: file.originalFilename })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteFileDialog
        fileId={dialogState.id}
        filename={dialogState.name}
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
      />
    </>
  );
}
