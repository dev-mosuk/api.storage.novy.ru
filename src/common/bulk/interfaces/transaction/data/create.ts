import { BulkTransactionStatus } from '@/common/bulk/enums/transaction/enums';

export type BulkTransactionSuccess<T> = {
  transaction_id: number;
  status: BulkTransactionStatus.SUCCESS;
  data: T;
};
