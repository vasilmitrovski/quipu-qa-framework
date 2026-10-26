import type { BaseApiClient } from '../client/base-api-client';
import type { ApiResponse } from '../client/api-response';

export class TransferService {
  constructor(private readonly client: BaseApiClient) {}

  /** POST /transfer — ParaBank returns a plain-text confirmation, not JSON. */
  transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<ApiResponse> {
    return this.client.post('/transfer', { fromAccountId, toAccountId, amount });
  }
}
