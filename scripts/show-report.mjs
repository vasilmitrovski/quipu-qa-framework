// Opens the HTML report for the current region. Reports are written per region
// (playwright-report/<region>), so a bare `playwright show-report` would open the wrong folder.
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const region = process.env.REGION || 'us';
const folder = `playwright-report/${region}`;

if (!existsSync(folder)) {
  console.error(`No report for region "${region}" yet (${folder} not found). Run the tests first, e.g. REGION=${region} npm test`);
  process.exit(1);
}

const result = spawnSync('npx', ['playwright', 'show-report', folder], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
