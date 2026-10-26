import { randomBytes } from 'node:crypto';

/**
 * Short, collision-resistant id safe to use in usernames on a shared public demo
 * (other people's test data lives on the same ParaBank instance).
 */
export function uniqueId(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(3).toString('hex');
  return `${prefix}${time}${rand}`;
}
