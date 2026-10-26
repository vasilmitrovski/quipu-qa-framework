import type { APIRequestContext } from '@playwright/test';
import type { RegionConfig } from '@config';
import { BaseApiClient } from './client/base-api-client';
import { AuthService } from './services/auth.service';
import { CustomerService } from './services/customer.service';
import { AccountsService } from './services/accounts.service';
import { TransferService } from './services/transfer.service';

export interface ApiClients {
  client: BaseApiClient;
  auth: AuthService;
  customers: CustomerService;
  accounts: AccountsService;
  transfers: TransferService;
}

/** Build all services on one request context. Any layer (API, Web, Mobile) can call this. */
export function createApiClients(request: APIRequestContext, region: RegionConfig): ApiClients {
  const client = new BaseApiClient(request, region);
  return {
    client,
    auth: new AuthService(client),
    customers: new CustomerService(client),
    accounts: new AccountsService(client),
    transfers: new TransferService(client),
  };
}

export * from './schemas/account.schema';
export * from './schemas/customer.schema';
export * from './schemas/transaction.schema';
