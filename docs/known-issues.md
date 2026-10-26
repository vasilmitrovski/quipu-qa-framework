# Known issues (application under test)

ParaBank is a public demo with **intentional defects**. Tests that hit them are kept, annotated with
`known-issue`, and — where the correct behaviour is clear — marked `test.fail()`. The suite stays green
while the defect is visible in the report, and if ParaBank ever fixes the bug the test flips to
"unexpectedly passed" and tells us to remove the marker.

| ID | Area | Defect | Expected | Test |
|----|------|--------|----------|------|
| PB-001 | API `/transfer` | Negative amounts are accepted and reverse the money flow | 4xx, no balance change | `tests/api/transfer.spec.ts` — *negative amount is rejected* (`test.fail`) |
| PB-002 | API `/transfer` | Transfers larger than the available balance are accepted (account goes negative) | 4xx, no overdraft | `tests/api/transfer.spec.ts` — *larger than the balance is rejected* (`test.fail`) |
| PB-003 | API `/transfer` | No idempotency key; a retried request is applied twice | Accept `Idempotency-Key`, return original result on retry | `tests/api/transfer.spec.ts` — *repeating a transfer request applies it twice* (documents current behaviour) |
| PB-004 | API `/createAccount` | Response reports `balance: 0`, but the account actually holds the $100 opening deposit (a subsequent GET shows 100.00) | Response reflects the stored balance | `tests/api/accounts.spec.ts` — *createAccount response reports the funded balance* (`test.fail`) |
| PB-005 | Web session | Opening a protected page (e.g. `overview.htm`) without a session returns **HTTP 500 "An internal error has occurred"** instead of redirecting to login | 302 to the login page | `tests/web/login.spec.ts` — *logging out ends the session* (asserts no data leaks; annotated) |
| PB-006 | Registration | **Any field longer than its database column** is rejected with **"This username already exists."** No length validation, and the database error is misreported. Measured limits: first/last name 30, street 40, city/state/zip/phone/username 20, SSN 15. Realistic data trips it: Faker's US phones with extensions (21 chars), German states such as "Mecklenburg-Vorpommern" (22) | Field-level "maximum N characters" validation | `tests/api/auth.spec.ts` — *a username / phoneNumber longer than 20 characters gets an accurate error* (`test.fail`). Data factory fits values to `FIELD_LIMITS` |
| PB-007 | Registration | **Concurrent registrations randomly fail** with "This username already exists" for unique usernames (3 of 8 simultaneous sign-ups failed in one probe; sequential sign-ups always succeed). `createAccount` also intermittently returns 400 under parallel load | Writes are safe under concurrency | No dedicated test (non-deterministic). Mitigated: one worker per region, and `register` retries under a fresh username |

PB-001, PB-002 and PB-004 to PB-007 were reproduced on 2026-10-26, against the public instance and/or a
local `parasoft/parabank` container (e.g. `transfer amount=-25` → `200 "Successfully transferred $-25"`
and the destination is credited −25.00; transferring 99 999 from a 415.50 balance → 200 and a balance of
−99 568.76; a 21-character phone number → "This username already exists").

### How PB-006 / PB-007 were found

The first real runs failed intermittently with "This username already exists" for freshly generated,
unique usernames. Including the submitted profile in the error message showed that the failing cases had
21-character phone numbers (`1-730-978-5604 x04330` from Faker's US format), and a direct probe
(`20 chars → created`, `21 chars → "already exists"`) confirmed the limit for both username and phone.
The remaining failures only happened under parallel workers, and firing 8 simultaneous sign-ups with
short, valid data reproduced them outside the framework.

## Environment issues (not product defects)

| Issue | Impact | Mitigation |
|-------|--------|------------|
| The public instance resets its database periodically and is shared by everyone | Fixed users like `john/demo` disappear or have unpredictable balances | Every test registers its own customer (`seededCustomer` fixture) |
| The public instance is sometimes slow or returns "An internal error has occurred" | Occasional flaky failures | 2 retries in CI, traces on retry, and the `local` Docker region as a stable target for PRs |
| The public instance sits behind **Cloudflare rate limiting**: sustained traffic gets HTTP 429 ("Error 1015: You are being rate limited"), then 403 blocks, for several minutes | A full run (all layers, both browsers ≈ 33 tests) against a public region gets throttled part-way through, even with one worker | One worker per region, bounded backoff on 429/503 (honours `Retry-After`, capped at 15 s), errors labelled `[environment]`, and CI runs only `@smoke` against public regions on PRs (full suite on `local`, full matrix nightly) |
| REST endpoints return XML unless `Accept: application/json` is sent | Confusing parse errors | `BaseApiClient` always sends the header |
| There is no REST endpoint to register a customer | Setup can't be pure REST | `CustomerService.register` submits the registration form over HTTP (still no browser) |
| Posting `register.htm` without first loading it returns **500 "An internal error has occurred"** (the form object lives in the HTTP session) | Naive HTTP registration fails | `register` GETs the form on the same request context before posting |

> If a `test.fail()` test reports "expected to fail but passed" on some instance, that defect isn't
> present there — remove the `test.fail()` line and the row above.
