import { BulkTransactionSuccess } from '@/common/bulk/interfaces/transaction/data/create';
import { BulkTransactionError } from '@/common/bulk/interfaces/transaction/error/create';

export type BulkTransaction<T> =
  | BulkTransactionSuccess<T>
  | BulkTransactionError;
