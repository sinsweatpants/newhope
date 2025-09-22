import type { FullConfig } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

async function globalSetup(_config: FullConfig) {
  const authDir = path.resolve(process.cwd(), 'playwright/.auth');
  await mkdir(authDir, { recursive: true });
  const authFile = path.join(authDir, 'user.json');

  await writeFile(authFile, JSON.stringify({ cookies: [], origins: [] }), { encoding: 'utf8' });
}

export default globalSetup;
