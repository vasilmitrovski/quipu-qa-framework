import type { BaseApiClient } from '../client/base-api-client';
import type { ApiResponse } from '../client/api-response';
import {
  AccountListSchema,
  AccountSchema,
  accountTypeCode,
  type Account,
  type AccountType,
} from '../schemas/account.schema';
import { TransactionListSchema, type Transaction } from '../schemas/transaction.schema';

export class AccountsService {
  constructor(private readonly client: BaseApiClient) {}

  listForCustomer(customerId: number): Promise<ApiResponse> {
    return this.client.get(`/customers/${customerId}/accounts`);
  }

  async listForCustomerOrThrow(customerId: number): Promise<Account[]> {
    return (await this.listForCustomer(customerId)).ensureOk().parse(AccountListSchema);
  }

  get(accountId: number): Promise<ApiResponse> {
    return this.client.get(`/accounts/${accountId}`);
  }

  async getOrThrow(accountId: number): Promise<Account> {
    return (await this.get(accountId)).ensureOk().parse(AccountSchema);
  }

  /** Opens a new account funded from an existing one (ParaBank moves a minimum deposit across). */
  create(customerId: number, type: Exclude<AccountType, 'LOAN'>, fromAccountId: number): Promise<ApiResponse> {
    return this.client.post('/createAccount', {
      customerId,
      newAccountType: accountTypeCode[type],
      fromAccountId,
    });
  }

  async createOrThrow(customerId: number, type: Exclude<AccountType, 'LOAN'>, fromAccountId: number): Promise<Account> {
    return (await this.create(customerId, type, fromAccountId)).ensureOk().parse(AccountSchema);
  }

  transactions(accountId: number): Promise<ApiResponse> {
    return this.client.get(`/accounts/${accountId}/transactions`);
  }

  async transactionsOrThrow(accountId: number): Promise<Transaction[]> {
    return (await this.transactions(accountId)).ensureOk().parse(TransactionListSchema);
  }
}
