/**
 * scripts/data/fetchCache.ts
 *
 * Download cache for `npm run build-data`. Responses live under `.cache/data/`
 * (git-ignored). Delete that directory to force a fresh download.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const CACHE_DIR = resolve(process.cwd(), ".cache", "data");
const MAX_ATTEMPTS = 5;

async function downloadWithRetries(url: string): Promise<Buffer> {
  let lastError = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delayMs = 2000 * 2 ** (attempt - 1);
      console.log(`    retry ${attempt}/${MAX_ATTEMPTS - 1} in ${delayMs / 1000}s (${lastError})`);
      await new Promise<void>((settle) => setTimeout(settle, delayMs));
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
      lastError = `HTTP ${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`${url} → ${lastError}`);
}

/** Downloads `url` (or reads the cached copy) and returns the raw bytes. */
export async function fetchBinary(url: string, cacheName: string): Promise<Buffer> {
  const digest = createHash("sha1").update(url).digest("hex").slice(0, 8);
  const cachePath = join(CACHE_DIR, `${digest}-${cacheName}`);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath);
  }

  console.log(`  downloading ${url}`);
  const bytes = await downloadWithRetries(url);

  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, bytes);
  return bytes;
}
