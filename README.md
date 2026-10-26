# Quipu QA Challenge — Multi-region Playwright Framework

A Playwright + TypeScript test framework for **ParaBank** covering two independently runnable layers,
**API** and **Web**, that share one core (config, data, utilities, reporting) and switch region by
configuration alone.

**Run it** (needs Node.js 20+ and Docker running; details and Windows commands in [§5](#5-running-locally)):

```bash
npm install && npx playwright install chromium firefox
npm run parabank:up               # start a private ParaBank in Docker and wait until it's ready
REGION=local npm test             # full suite: API + Web on Chromium and Firefox (33 tests)
npm run parabank:down             # stop ParaBank when done
```

---

## 1. Why ParaBank

- **Domain match.** It's a banking app with accounts, balances, transfers and transaction history,
  close to the payments/accounts/notifications context in the brief.
- **One backend, two surfaces.** The web UI and the REST API (`/parabank/services/bank`) share the same
  data, so a Web test can genuinely seed state through the API and verify the UI's claims against it.
- **Self-hostable.** The `parasoft/parabank` Docker image provides a real second deployment (`local`
  region) — a stable target for CI and proof that region switching changes the actual host.
- **Realistic defects.** Its intentional bugs (see [docs/known-issues.md](docs/known-issues.md)) let the
  suite show how known defects are tracked without hiding them or breaking the build.

## 2. Architecture

```
config/            region files + Zod schema + resolver (REGION env → validated config)
src/core/          shared by every layer: fixtures, data factories, money/id/poll utils, reporting
src/api/           BaseApiClient, services (auth, customers, accounts, transfers), Zod schemas, fixtures
src/web/           page objects, components, fixtures (extends the API fixtures)
tests/api/         API specs — no browser is ever launched
tests/web/         Web specs — can use API operations for setup and verification
docs/              known issues, mobile design (Part 2)
.github/workflows  CI with layer/region selection
```

### Layering and sharing

```
core/fixtures   → { region, log, data }
   ▲
api/fixtures    → + { apiContext, api, seededCustomer, accountPair }
   ▲
web/fixtures    → + { loginPage, overviewPage, transferPage, openAccountPage, loggedInPage }
```

- **Independent:** each layer is a Playwright project with its own `testDir`. `--project=api` runs no
  browser code. An ESLint `no-restricted-imports` rule enforces `core ← api ← web`, so API tests can't
  accidentally import browser code.
- **Shared:** Web fixtures *extend* API fixtures, so any Web test can call `api.accounts.getOrThrow()`.
  `createApiClients(request, region)` is a plain function, so a future mobile layer reuses it too.

### Design decisions

| Decision | Why |
|---|---|
| **Fresh customer per test** (`seededCustomer`) | The public ParaBank is shared and resets its DB. Tests never depend on `john/demo` or on each other |
| **Parallelism and retries per region** (`throttling` in the region config) | How hard a deployment can be driven is a property of the target, not the test machine. ParaBank writes aren't concurrency-safe (PB-007) and the public demo is behind Cloudflare rate limiting, so regions run 1 worker and back off on 429/503 (`Retry-After` honoured, capped at 15 s). Only those statuses are retried, so a retry can never double-apply a request the app processed. CI gets its parallelism from separate jobs per region and browser |
| **Environment vs product failures** | Cloudflare 429/403 responses fail with an `[environment]` label, so a rate-limited run never reads like a product bug |
| **Registration is retry-safe** | If a retried sign-up hits "already exists", `register` checks whether our credentials already work (then it's ours) and otherwise retries under a fresh username (PB-007). Errors include the submitted profile, because ParaBank's error messages are misleading (PB-006) |
| **Programmatic login** (`loggedInPage`) | `page.request` shares the browser's cookie jar. Posting the login form there authenticates the browser without UI steps. Only the login spec exercises the login UI |
| **Zod schemas** | One definition gives runtime contract validation and the TS types. `ApiResponse.parse()` reports every mismatching field at once |
| **Services return `ApiResponse`; `*OrThrow` helpers for setup** | Negative tests assert on raw status/body; setup code stays one line and fails loudly |
| **Call log attached on failure** | Every API call made in a failing test is attached as `api-calls.json`, so CI failures can be debugged without re-running |
| **Known defects as `test.fail()` + annotation** | The build stays green, the defect stays visible in the report, and a fix in the app is noticed automatically |
| **Integer-cent comparisons** (`toCents`) | Avoids floating-point false failures on money |

## 3. Regions

Regions are simulated through configuration because ParaBank has no regional deployments:

| Region | Host | Locale / currency | Limits | Feature flags |
|---|---|---|---|---|
| `us` (default) | public parabank.parasoft.com | en-US / USD | 1 – 10 000 | billPay, loans |
| `eu` | public | de-DE / EUR | 1 – 5 000 | billPay |
| `uk` | public | en-GB / GBP | 1 – 7 500 | loans |
| `local` | `localhost:8080` (Docker) | en-US / USD | 1 – 10 000 | billPay, loans |

What changes per region **without touching tests**: base URL, browser locale and timezone, generated
customer data (names/addresses via region-specific Faker), transfer amounts (within the region's
limits), money formatting in logs/reports, and report/artifact folders (`playwright-report/<region>`).

**Caveat:** ParaBank always renders `$` amounts in US format, so locale/currency drive data and
formatting helpers, not UI currency assertions. Against a real multi-region product, `parseUiMoney`
would become locale-aware using the same config.

**Adding a region:** create `config/regions/<name>.ts`, register it in `config/index.ts`, and add it to
the `ALL` list in the workflow. That's all. `BASE_URL` can also override any region's host ad hoc.

## 4. Test coverage

| Requirement | API | Web |
|---|---|---|
| Happy path | Login returns customer; new customer has a funded account; open account; transfer moves money (balances + transactions) | UI login → overview; UI transfer; UI open account |
| Error state | Wrong password; unknown user; unknown account; transfer to a non-existent account (balance unchanged) | Wrong password shows error; empty credentials; logout ends session |
| Idempotency / edge | Repeated GETs identical; repeated transfer POST double-applies (PB-003); 1-cent precision; negative amount (PB-001); overdraft (PB-002); over-length registration fields (PB-006) | Reload/back/forward after a transfer does **not** repeat it (checked via API) |
| Web uses API | — | `transfer.spec.ts`: accounts created via API → transfer in UI → balances verified via API. `open-account.spec.ts`: UI action verified via API. Overview balances compared with API |
| Schema validation | `accounts.spec.ts`: customer, account list, account and transactions validated with Zod | — |

Tag `@smoke` marks one fast test per area: `npm run test:smoke`.

### Verified results (2026-10-26)

| Target | Result |
|---|---|
| `REGION=local`, full suite (17 API + 8 Web × Chromium & Firefox = 33) | 33/33 on 3 consecutive runs, about 10 s each |
| `eu` and `uk` data against the local container (`BASE_URL=http://localhost:8080/parabank`) | 33/33 on 3 consecutive runs per region |
| `REGION=us` and `REGION=eu` (public demo), `@smoke` | 6/6 (`us`, API + Chromium) and 4/4 (`eu`, API) |
| `REGION=us` (public demo), full suite | 23 passed before Cloudflare rate limiting (429 → 403) kicked in. Every remaining failure was an environment block, not an assertion. This is why public regions run `@smoke` on PRs |

"Passing" includes the `test.fail()` known-defect tests failing as expected.

## 5. Running locally

**Prerequisites:**
- **Node.js 20+** (`node -v` to check).
- **Docker, installed and running** for the `local` region, e.g. the Docker Desktop app open with its
  engine started. `docker ps` should answer without an error.

```bash
npm install
npx playwright install chromium firefox
cp .env.example .env               # optional: set a default REGION (e.g. REGION=local)
```

### Quick start against a local ParaBank (recommended)

```bash
npm run parabank:up                # start ParaBank in Docker and wait until it's ready
REGION=local npm test              # 33 tests, ~15 s
npm run report                     # open the HTML report for REGION
npm run parabank:down              # stop it when done
```

A fresh ParaBank container needs up to a minute to boot and create its database. Until then some pages
already answer, but registration fails with HTTP 500. `parabank:up` therefore waits until the app
actually serves requests. If the container was started some other way (or is already running), run
`npm run parabank:wait` before the tests. Without `REGION=local` (or `REGION=local` in `.env`), tests
target the public demo instead.

### Full coverage across all regions

`npm test` runs one region per run (the one in `REGION`). To run the full suite for every region, point
each region at the local ParaBank with `BASE_URL`. Each region keeps its own locale, currency, limits and
generated data, without the public demo's rate limiting:

```bash
for r in local us eu uk; do REGION=$r BASE_URL=http://localhost:8080/parabank npm test; done
```

Expect 33 passed per region. Each region writes its own report: open one with, for example,
`REGION=eu npm run report`.

### Windows

The `npm run …` scripts work as-is, but `REGION=local npm test` and the `for` loop above are macOS/Linux
shell syntax. In **PowerShell**:

```powershell
$env:REGION="local"; npm test

foreach ($r in "local","us","eu","uk") { $env:REGION=$r; $env:BASE_URL="http://localhost:8080/parabank"; npm test }
Remove-Item Env:BASE_URL           # clear the override afterwards
```

Alternatively, put `REGION=local` in `.env` (then plain `npm test` uses it), or use Git Bash or WSL and
run the commands above unchanged. The suite is verified on macOS and on Linux (CI); these Windows
commands are provided for convenience.

| Command | What it runs |
|---|---|
| `npm test` | All layers, all browsers, region from `REGION` (default `us`) |
| `npm run test:api` | API layer only |
| `npm run test:web` | Web layer (Chromium + Firefox) |
| `npm run test:web:chromium` | Web layer, Chromium only |
| `npm run test:smoke` | `@smoke` tests only (API + Chromium), the gentle option for the public demo |
| `WORKERS=4 npm test` | Override the region's worker count (only sensible on a private deployment) |
| `REGION=uk npm run test:api` | Any command, any region |
| `npm run parabank:up` / `parabank:down` | Start (and wait for) / stop ParaBank in Docker for `REGION=local` |
| `npm run parabank:wait` | Wait until an already-started ParaBank is ready |
| `npm run report` | Open the last HTML report for `REGION` (reports are kept per region in `playwright-report/<region>`) |
| `npm run typecheck` / `npm run lint` | Static checks (including the layer dependency rule) |

Set `DEBUG_LOGS=1` for verbose per-test logging.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot connect to the Docker daemon` | Docker isn't running | Start Docker (e.g. open Docker Desktop), wait until it's ready, retry |
| `The container name "/parabank" is already in use` | ParaBank is already running | Nothing to fix: run `npm run parabank:wait`, then the tests. For a fresh start: `npm run parabank:down`, then `npm run parabank:up` |
| `port is already allocated` (8080) | Another app or Docker engine is using port 8080 | Stop whatever uses it (`docker ps` shows other containers), then retry |
| `POST …/register.htm -> 500` on `localhost` | ParaBank was still starting | `npm run parabank:wait`, then re-run the tests |
| URLs show `parabank.parasoft.com`, or the run takes minutes | `REGION` isn't `local`, so tests hit the public demo | Prefix `REGION=local` or set it in `.env` |
| `[environment] … 403` / `429` | The public demo's Cloudflare rate limiting (not a test failure) | Use `REGION=local`, or wait a few minutes and re-run `npm run test:smoke -- --retries=2` |
| Red ✘ on *"a negative amount is rejected"* and similar | Known ParaBank defects marked `test.fail()`, counted as passed | None: check the summary line says passed, see [docs/known-issues.md](docs/known-issues.md) |
| `npm run report` says no report found | No run yet for that `REGION` | Run the tests for that region first |

## 6. CI (GitHub Actions)

`.github/workflows/tests.yml`:

- **Manual run** (`workflow_dispatch`): choose `layer` = all / api / web and `region` = all / us / eu / uk / local.
- **Pull request / push to main:** full API and Web suites (Chromium) on the isolated `local`
  container, plus `@smoke` API tests on each public region (`us`, `eu`, `uk`). Fast, and it stays within
  the public demo's rate limits.
- **Nightly:** full matrix (all regions × Chromium and Firefox).
- `api` and `web` are separate jobs gated by the `layer` input, each with a region matrix
  (`fail-fast: false`). The `local` region starts ParaBank as a service container.
- A `static` job (typecheck + lint) gates both.
- Each matrix cell uploads its HTML report, traces/videos and JUnit XML as an artifact.

## 7. Known application issues

See [docs/known-issues.md](docs/known-issues.md): negative transfers accepted (PB-001), overdraft
allowed (PB-002), no transfer idempotency (PB-003), `createAccount` returning a stale balance (PB-004),
protected pages returning 500 when logged out (PB-005), any over-length registration field misreported as
"username already exists" (PB-006), and registration races under concurrency (PB-007). Environment
issues: shared DB resets, occasional 500s, Cloudflare rate limiting, XML-by-default responses, no REST
registration endpoint, and a registration form that requires a prior GET. The doc also explains how PB-006
and PB-007 were tracked down from intermittent failures.

## 8. Mobile (Part 2)

See [docs/mobile-design.md](docs/mobile-design.md). In short: a WebdriverIO + Appium layer under
`src/mobile/` that reuses `config/`, `src/core/` and the API services for setup, runs in the same CI
`plan` matrix, and reports through shared JUnit/Allure output.

## 9. What I'd add next

- Contract tests that pin the schemas to a versioned OpenAPI spec.
- A `test.step` wrapper that logs region-formatted amounts in the report.
- Accessibility checks (`@axe-core/playwright`) on key pages.
- Merged multi-region HTML report (Playwright blob reports + `merge-reports`) published to GitHub Pages.
