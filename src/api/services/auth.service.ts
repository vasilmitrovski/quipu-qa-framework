import type { BaseApiClient } from '../client/base-api-client';
import type { ApiResponse } from '../client/api-response';
import { CustomerSchema, type Customer } from '../schemas/customer.schema';

export class AuthService {
  constructor(private readonly client: BaseApiClient) {}

  /** GET /login/{username}/{password} — returns the customer on success. */
  login(username: string, password: string): Promise<ApiResponse> {
    return this.client.get(`/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
  }

  async loginOrThrow(username: string, password: string): Promise<Customer> {
    return (await this.login(username, password)).ensureOk().parse(CustomerSchema);
  }
}
