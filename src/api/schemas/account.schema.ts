import { z } from 'zod';

export const AccountTypeSchema = z.enum(['CHECKING', 'SAVINGS', 'LOAN']);

export const AccountSchema = z.object({
  id: z.number().int().positive(),
  customerId: z.number().int().positive(),
  type: AccountTypeSchema,
  balance: z.number(),
});

export const AccountListSchema = z.array(AccountSchema);

export type AccountType = z.infer<typeof AccountTypeSchema>;
export type Account = z.infer<typeof AccountSchema>;

/** ParaBank's createAccount endpoint takes a numeric type code. */
export const accountTypeCode: Record<Exclude<AccountType, 'LOAN'>, number> = {
  CHECKING: 0,
  SAVINGS: 1,
};
