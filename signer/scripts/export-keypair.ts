/**
 * Convert a Solana CLI keypair file (a JSON array of 64 bytes, e.g.
 * ~/.config/solana/id.json) into the base58 secret key string that the signer's
 * PLATFORM_SECRET_KEY env var expects.
 *
 *   npm run export-key                       # reads ~/.config/solana/id.json
 *   npm run export-key -- /path/to/key.json  # reads a specific file
 *
 * Prints ONLY the base58 string to stdout (so you can pipe/copy it). The secret
 * key is sensitive — do not commit it or paste it anywhere public.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import bs58 from "bs58";

const path = process.argv[2] || join(homedir(), ".config", "solana", "id.json");

let raw: string;
try {
  raw = readFileSync(path, "utf8");
} catch {
  console.error(`Could not read keypair file at: ${path}`);
  console.error("Pass a path, e.g. `npm run export-key -- /path/to/id.json`.");
  process.exit(1);
}

let bytes: number[];
try {
  bytes = JSON.parse(raw);
} catch {
  console.error(`File is not valid JSON: ${path}`);
  process.exit(1);
}

if (!Array.isArray(bytes) || (bytes.length !== 64 && bytes.length !== 32)) {
  console.error(
    `Expected a JSON array of 32 or 64 bytes, got length ${Array.isArray(bytes) ? bytes.length : "n/a"}.`
  );
  process.exit(1);
}

process.stdout.write(bs58.encode(Uint8Array.from(bytes)) + "\n");
