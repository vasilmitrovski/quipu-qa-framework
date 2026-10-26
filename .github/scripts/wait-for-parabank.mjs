// Waits until a ParaBank instance can actually serve the tests, then initialises its database.
// Node (not curl) so it runs on the plain runner and inside the Playwright container alike.
//
// "The home page answers" is not enough: while the app boots, index.htm can already respond while
// registration still returns 500. So readiness means the pages the tests use AND a database-backed
// REST call (the demo user that ships with ParaBank) all succeed.
const baseUrl = process.argv[2] ?? 'http://localhost:8080/parabank';
const checks = [
  `${baseUrl}/index.htm`,
  `${baseUrl}/register.htm`,
  `${baseUrl}/services/bank/login/john/demo`,
];

async function ready() {
  for (const url of checks) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
  }
  return true;
}

for (let attempt = 1; attempt <= 90; attempt++) {
  try {
    if (await ready()) {
      console.log(`ParaBank is up at ${baseUrl} (after ${attempt} attempts)`);
      await fetch(`${baseUrl}/services/bank/initializeDB`, { method: 'POST' }).catch(() => undefined);
      process.exit(0);
    }
  } catch {
    // Not accepting connections yet.
  }
  if (attempt === 1) console.log(`Waiting for ParaBank at ${baseUrl} ...`);
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}

console.error(`ParaBank did not become ready at ${baseUrl} within 3 minutes`);
process.exit(1);
