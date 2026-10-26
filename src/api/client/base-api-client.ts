import type { APIRequestContext } from '@playwright/test';
import type { RegionConfig } from '@config';
import { ApiResponse } from './api-response';

export interface CallRecord {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  responseBody: string;
}

type Params = Record<string, string | number | boolean>;

/**
 * Wraps Playwright's APIRequestContext for the ParaBank REST API:
 * resolves region URLs, forces JSON (ParaBank defaults to XML) and records every call
 * so failed tests can attach the full request history to the report.
 */
export class BaseApiClient {
  readonly calls: CallRecord[] = [];

  constructor(
    private readonly request: APIRequestContext,
    readonly region: RegionConfig,
  ) {}

  /** Absolute URL for a REST endpoint, e.g. apiUrl('/accounts/123'). */
  apiUrl(path: string): string {
    return `${this.region.baseUrl}${this.region.apiPath}${path}`;
  }

  /** Absolute URL for a web-app path, e.g. webUrl('/register.htm'). */
  webUrl(path: string): string {
    return `${this.region.baseUrl}${path}`;
  }

  get(path: string, params?: Params): Promise<ApiResponse> {
    return this.send('GET', this.apiUrl(path), { params });
  }

  post(path: string, params?: Params): Promise<ApiResponse> {
    return this.send('POST', this.apiUrl(path), { params });
  }

  /** Load a web-app page over HTTP (no browser), e.g. to open a server-side form session. */
  getPage(path: string): Promise<ApiResponse> {
    return this.send('GET', this.webUrl(path), { accept: 'text/html' });
  }

  /** Submit an HTML form on the web app (used where ParaBank has no REST equivalent, e.g. registration). */
  postForm(path: string, form: Record<string, string>): Promise<ApiResponse> {
    return this.send('POST', this.webUrl(path), { form, accept: 'text/html' });
  }

  private async send(
    method: 'GET' | 'POST',
    url: string,
    opts: { params?: Params; form?: Record<string, string>; accept?: string },
  ): Promise<ApiResponse> {
    const { maxRetries, baseDelayMs } = this.region.throttling;
    for (let attempt = 0; ; attempt++) {
      const started = Date.now();
      const response = await this.request.fetch(url, {
        method,
        params: opts.params,
        form: opts.form,
        headers: { Accept: opts.accept ?? 'application/json' },
        failOnStatusCode: false,
      });
      const text = await response.text();
      const fullUrl = response.url();
      const status = response.status();
      this.calls.push({
        method,
        url: fullUrl,
        status,
        durationMs: Date.now() - started,
        responseBody: text.slice(0, 2_000),
      });

      // Rate limiting / temporary unavailability is an environment condition, not a product response.
      // Only these are retried, so a retried POST can never double-apply a request the server processed.
      if (RETRYABLE_STATUSES.has(status) && attempt < maxRetries) {
        await sleep(retryDelayMs(response.headers()['retry-after'], baseDelayMs, attempt));
        continue;
      }
      return new ApiResponse(method, fullUrl, status, response.headers(), text);
    }
  }
}

const RETRYABLE_STATUSES = new Set([429, 503]);

function retryDelayMs(retryAfter: string | undefined, baseDelayMs: number, attempt: number): number {
  const seconds = Number(retryAfter);
  // Capped so a run of retries always ends well inside the test timeout with a clear error, not a timeout.
  if (retryAfter && !Number.isNaN(seconds)) return Math.min(seconds * 1_000, MAX_RETRY_DELAY_MS);
  // Exponential backoff with jitter so parallel workers don't retry in lockstep.
  return Math.min(baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs, MAX_RETRY_DELAY_MS);
}

const MAX_RETRY_DELAY_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
