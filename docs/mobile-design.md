# Part 2 — Mobile (Android / iOS) design

How native mobile tests would plug into this framework while sharing configuration, data, API
operations and reporting.

## 1. Driver choice

**WebdriverIO + Appium 2** (UiAutomator2 for Android, XCUITest for iOS).

- Playwright doesn't automate native apps (Android support is experimental and web-view only; no iOS),
  so the mobile layer needs its own runner.
- WebdriverIO is TypeScript-first and has a mature Appium service and parallel device runs. Its
  config shape is close to Playwright's, so the region/config code drops straight in.
- Alternative considered: Detox (fast, but gray-box and React Native-centric) and Maestro (YAML, very
  fast to write but hard to share TypeScript utilities with). Appium keeps one language and one
  shared codebase.

## 2. Where it fits

```
src/
├── core/        ← unchanged, already shared (config, factories, utils, reporting helpers)
├── api/         ← unchanged; mobile tests use it for setup/verification exactly like web tests
├── web/
└── mobile/
    ├── capabilities/   android.ts, ios.ts — built from RegionConfig + device profile
    ├── screens/        LoginScreen, AccountsScreen, TransferScreen (screen objects)
    ├── components/     shared widgets (tab bar, dialogs)
    └── fixtures.ts     region, data, api clients, logged-in app session
tests/
└── mobile/
    ├── login.spec.ts
    └── transfer.spec.ts
wdio.conf.ts            ← separate runner config, imports the same `config/`
```

The dependency rule extends naturally: `mobile` may import `core` and `api`, never `web`. The ESLint
rule gets one more block.

## 3. What gets shared

| Concern | How mobile reuses it |
|---|---|
| Region config | `config/index.ts` is runner-agnostic. Region files gain an optional `mobile` block: `{ androidAppPath, iosAppPath, bundleId, appPackage, deepLinkScheme }` validated by the same Zod schema |
| Locale / currency | Passed as Appium capabilities (`appium:language`, `appium:locale`), so the device runs in the region's locale |
| Test data | `buildCustomer(region)` and `validTransferAmount(region)` used as-is |
| API setup / verification | `createApiClients(request, region)` takes any HTTP context; under WebdriverIO we pass Playwright's standalone `request.newContext()` (Playwright installed as a library), or swap in a tiny fetch-based adapter behind the same interface |
| Auth shortcut | Like `loggedInPage`: seed a customer via the API, then open the app with a deep link / launch argument carrying a session token, skipping the login UI in non-login tests |
| Reporting | All runners emit **JUnit** (already produced by Playwright) and **Allure** results; CI merges them into one report per region with layer as a label |

## 4. Fixtures under WebdriverIO

WebdriverIO has no fixture system like Playwright's, so `src/mobile/fixtures.ts` exposes a small
`withMobileContext()` helper used in `before`/`beforeEach` hooks. It returns `{ region, data, api,
seededCustomer }` built by the same functions the Playwright fixtures call. That keeps one source
of truth for *how* setup is done, even though *when* it runs is wired differently.

## 5. Selectors

- Require `accessibilityId` / `testID` on interactive elements (one id works on both platforms).
- Screen objects expose intent (`transfer(amount, from, to)`), with platform differences hidden
  inside (`driver.isAndroid ? … : …`), so specs are identical for Android and iOS.

## 6. CI

A third job, `mobile`, uses the same `plan` job outputs (`layer: mobile`, region matrix):

- **Android on PRs**: `reactivecircus/android-emulator-runner` on `ubuntu-latest` (KVM), one API level.
- **iOS + broader Android nightly**: a device cloud (BrowserStack / Sauce Labs / AWS Device Farm).
  The capability builder switches to cloud capabilities when `DEVICE_CLOUD=…` is set, so specs don't change.
- Artifacts: Appium logs, screenshots and video on failure, and JUnit/Allure results.

## 7. Adding a region (all layers)

1. Add `config/regions/<name>.ts` (including the optional `mobile` block).
2. Register it in `config/index.ts`.
3. Add it to the `ALL` list in `.github/workflows/tests.yml`.

No API, Web or Mobile test changes.
