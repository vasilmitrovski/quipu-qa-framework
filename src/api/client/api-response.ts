import type { ZodType } from 'zod';

/** Thin, test-friendly view of an HTTP response with schema parsing built in. */
export class ApiResponse {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly status: number,
    readonly headers: Record<string, string>,
    readonly text: string,
  ) {}

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  /** Body as JSON, or undefined when the body is not JSON (ParaBank returns plain text for some errors). */
  get json(): unknown {
    try {
      return JSON.parse(this.text);
    } catch {
      return undefined;
    }
  }

  /** Throws with method, URL, status and body when the call was not 2xx. Returns this for chaining. */
  ensureOk(): this {
    if (this.blockedByEnvironment) {
      throw new Error(
        `[environment] ${this.method} ${this.url} -> ${this.status}: blocked by the host's rate limiting (Cloudflare). ` +
          'Not a product failure — lower REGION throttling.workers, wait, or use REGION=local.',
      );
    }
    if (!this.ok) {
      throw new Error(`${this.method} ${this.url} -> ${this.status}\n${this.text.slice(0, 500)}`);
    }
    return this;
  }

  /** True when an edge proxy (not the application) rejected the request. */
  get blockedByEnvironment(): boolean {
    return this.status === 429 || (this.status === 403 && /cloudflare/i.test(this.text));
  }

  /** Validate the JSON body against a schema and return the typed result. */
  parse<T>(schema: ZodType<T>): T {
    const result = schema.safeParse(this.json);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
      throw new Error(`Schema validation failed for ${this.method} ${this.url}:\n${issues}\nBody: ${this.text.slice(0, 500)}`);
    }
    return result.data;
  }
}
