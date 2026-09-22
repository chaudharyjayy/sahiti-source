import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Copies `.env` into `process.env` without exposing those names to the browser.
 * Vite only injects `VITE_*` on the client; chat and Places keys must stay here.
 */
export function loadLocalEnv(): void {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function serverSecret(name: string): string | undefined {
  loadLocalEnv();
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
