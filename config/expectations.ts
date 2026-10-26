/**
 * Known defects that only some ParaBank deployments have (not regions). Keyed by the host the tests
 * actually talk to, so pointing any region at another host with BASE_URL picks up that host's
 * behaviour, and tests never contain deployment names.
 *
 * Tests always assert the correct behaviour; when the deployment under test has a known defect, the
 * test is marked `test.fail()` with the issue id, so the defect stays visible without breaking the run.
 */
export interface KnownDefect {
  id: string;
  summary: string;
}

export interface Expectations {
  /** A wrong password must be rejected with "could not be verified" and leave the user logged out. */
  invalidLoginDefect?: KnownDefect;
}

const byHost: Record<string, Expectations> = {
  'parabank.parasoft.com': {
    invalidLoginDefect: {
      id: 'PB-008',
      summary: 'Public instance: a wrong password logs the user in (or lands on an HTTP 500 page) instead of being rejected',
    },
  },
};

export function expectationsFor(baseUrl: string): Expectations {
  return byHost[new URL(baseUrl).host] ?? {};
}
