import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';

export type BulkTransactionError = {
  transaction_id: number;
  status: BulkTransactionStatus.ERROR;
  errors?: Record<string, string>;
};
