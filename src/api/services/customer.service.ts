import { MAX_USERNAME_LENGTH, type NewCustomer } from '@core/data/customer.factory';
import { uniqueId } from '@core/utils/ids';
import type { BaseApiClient } from '../client/base-api-client';
import type { ApiResponse } from '../client/api-response';
import { CustomerSchema, type Customer } from '../schemas/customer.schema';

export class CustomerService {
  constructor(private readonly client: BaseApiClient) {}

  get(customerId: number): Promise<ApiResponse> {
    return this.client.get(`/customers/${customerId}`);
  }

  async getOrThrow(customerId: number): Promise<Customer> {
    return (await this.get(customerId)).ensureOk().parse(CustomerSchema);
  }

  /**
   * Registers a customer. ParaBank exposes no REST endpoint for this, so we submit the
   * same form the browser does — still an API-level operation, no browser needed.
   */
  /**
   * Registers a customer and returns the profile actually registered. The username may differ
   * from the input when ParaBank's registration race (PB-007) forced a retry under a new name.
   */
  async register(c: NewCustomer, maxAttempts = 4): Promise<NewCustomer> {
    let candidate = c;
    for (let attempt = 1; ; attempt++) {
      const error = await this.tryRegister(candidate);
      if (!error) return candidate;
      const raceSuspected = /already exists/i.test(error);
      // Idempotent setup: if a retried POST had already been processed, the user exists with *our* password.
      if (raceSuspected && (await this.canLogIn(candidate.username, candidate.password))) return candidate;
      // PB-007: concurrent registrations fail with "already exists" and leave the name unusable,
      // so retry under a fresh username of the same length.
      if (raceSuspected && attempt < maxAttempts && c.username.length <= MAX_USERNAME_LENGTH) {
        await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 800));
        candidate = { ...c, username: uniqueId(c.username.slice(0, 3)) };
        continue;
      }
      // Include the submitted data: ParaBank's errors are misleading (PB-006), so the input is what explains them.
      throw new Error(`Registration of "${candidate.username}" failed: ${error}\nSubmitted: ${JSON.stringify(candidate)}`);
    }
  }

  /** One registration attempt. Returns undefined on success, or the error message ParaBank showed. */
  private async tryRegister(c: NewCustomer): Promise<string | undefined> {
    // ParaBank keeps the form object in the HTTP session; posting without loading the form first returns a 500.
    (await this.client.getPage('/register.htm')).ensureOk();
    const response = await this.client.postForm('/register.htm', {
      'customer.firstName': c.firstName,
      'customer.lastName': c.lastName,
      'customer.address.street': c.street,
      'customer.address.city': c.city,
      'customer.address.state': c.state,
      'customer.address.zipCode': c.zipCode,
      'customer.phoneNumber': c.phoneNumber,
      'customer.ssn': c.ssn,
      'customer.username': c.username,
      'customer.password': c.password,
      repeatedPassword: c.password,
    });
    response.ensureOk();
    if (/created successfully/i.test(response.text)) return undefined;
    return response.text.match(/<span[^>]*class="error"[^>]*>([^<]+)</i)?.[1]?.trim() ?? 'unknown error';
  }

  private async canLogIn(username: string, password: string): Promise<boolean> {
    const response = await this.client.get(`/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
    return response.ok;
  }
}
