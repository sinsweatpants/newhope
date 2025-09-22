import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  // No teardown required yet but file is kept for future hooks.
}

export default globalTeardown;
