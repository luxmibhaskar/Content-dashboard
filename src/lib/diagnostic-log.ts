import { appendFile, mkdir } from "fs/promises";
import path from "path";

// Temporary diagnostic logging (see src/lib/anthropic.ts callers). Console
// output alone doesn't survive past whatever terminal window happened to be
// open, which made a past "did the double-invocation fix actually work"
// check unverifiable after the fact. Appends to a local file too so runs are
// checkable later, not just at the moment they happen. Local dev only, this
// directory won't exist/persist on Vercel, callers must not depend on it.
const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "research-and-copy.log");

export async function logDiagnostic(line: string): Promise<void> {
  const withTimestamp = `${new Date().toISOString()} ${line}`;
  console.log(withTimestamp);
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, withTimestamp + "\n", "utf8");
  } catch (err) {
    console.error("[diagnostic-log] failed to write log file:", err);
  }
}
