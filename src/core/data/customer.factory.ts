import { fakerDE, fakerEN_GB, fakerEN_US, type Faker } from '@faker-js/faker';
import type { RegionConfig } from '@config';
import { uniqueId } from '../utils/ids';

export interface NewCustomer {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

const fakerByLocale: Record<string, Faker> = {
  'en-US': fakerEN_US,
  'en-GB': fakerEN_GB,
  'de-DE': fakerDE,
};

/**
 * ParaBank's column sizes (measured against parasoft/parabank on 2026-10-26). Longer values are
 * rejected with a misleading "This username already exists" (PB-006), so generated data is fitted
 * to them. Realistic locale data hits these: e.g. the German state "Mecklenburg-Vorpommern" is 22 chars.
 */
export const FIELD_LIMITS = {
  firstName: 30,
  lastName: 30,
  street: 40,
  city: 20,
  state: 20,
  zipCode: 20,
  phoneNumber: 20,
  ssn: 15,
  username: 20,
} as const satisfies Partial<Record<keyof NewCustomer, number>>;

export const MAX_USERNAME_LENGTH = FIELD_LIMITS.username;

/** Builds region-flavoured customer data that ParaBank accepts. Every call returns a unique username. */
export function buildCustomer(region: RegionConfig, overrides: Partial<NewCustomer> = {}): NewCustomer {
  const f = fakerByLocale[region.locale] ?? fakerEN_US;
  // 'q' + 2-char region tag + 14-char unique id = 17 chars, safely under the limit.
  const username = uniqueId(`q${region.name.slice(0, 2)}`);
  if (username.length > FIELD_LIMITS.username) {
    throw new Error(`Generated username "${username}" exceeds ${FIELD_LIMITS.username} characters`);
  }
  const generated: NewCustomer = {
    firstName: f.person.firstName(),
    lastName: f.person.lastName(),
    street: f.location.streetAddress(),
    city: f.location.city(),
    state: f.location.state(),
    zipCode: f.location.zipCode(),
    // 'national' avoids extensions like "x04330" that push US numbers past the limit.
    phoneNumber: f.phone.number({ style: 'national' }),
    ssn: f.string.numeric(9),
    username,
    password: `Pw-${f.string.alphanumeric(10)}`,
  };
  // Overrides are applied after fitting, so tests can deliberately send over-length values.
  return { ...fitToLimits(generated), ...overrides };
}

function fitToLimits(c: NewCustomer): NewCustomer {
  const fitted = { ...c };
  for (const [field, max] of Object.entries(FIELD_LIMITS) as [keyof typeof FIELD_LIMITS, number][]) {
    fitted[field] = fitted[field].slice(0, max).trim();
  }
  return fitted;
}
