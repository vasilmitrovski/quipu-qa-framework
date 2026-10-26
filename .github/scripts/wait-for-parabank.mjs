// Waits until a ParaBank instance serves its home page, then initialises its database.
// Node (not curl) so it runs on the plain runner and inside the Playwright container alike.
const baseUrl = process.argv[2] ?? 'http://localhost:8080/parabank';

for (let attempt = 1; attempt <= 60; attempt++) {
  try {
    const res = await fetch(`${baseUrl}/index.htm`);
    if (res.ok) {
      console.log(`ParaBank is up at ${baseUrl} (after ${attempt} attempts)`);
      await fetch(`${baseUrl}/services/bank/initializeDB`, { method: 'POST' }).catch(() => undefined);
      process.exit(0);
    }
  } catch {
    // Not accepting connections yet.
  }
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}

console.error(`ParaBank did not become ready at ${baseUrl}`);
process.exit(1);
