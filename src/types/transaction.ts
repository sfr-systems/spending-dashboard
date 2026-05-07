export type TransactionType =
  | "debit"
  | "credit"
  | "transfer"
  | "fee"
  | "refund"
  | "unknown";

export type UploadStatus = "uploaded" | "processing" | "processed" | "failed";

export type NormalizedTransaction = {
  transactionDate: string;
  postedDate?: string;
  description: string;
  merchant?: string;
  amount: number;
  category?: string;
  transactionType: TransactionType;
  accountName?: string;
  notes?: string;
  rawData: Record<string, string>;
};
