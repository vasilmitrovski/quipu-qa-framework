import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.number().int().positive(),
  accountId: z.number().int().positive(),
  type: z.enum(['Credit', 'Debit']),
  // ParaBank serialises dates as epoch milliseconds; accept ISO strings too in case a deployment differs.
  date: z.union([z.number(), z.string()]),
  amount: z.number(),
  description: z.string(),
});

export const TransactionListSchema = z.array(TransactionSchema);

export type Transaction = z.infer<typeof TransactionSchema>;
