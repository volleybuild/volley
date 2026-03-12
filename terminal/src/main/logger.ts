import { app } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";

const MAX_LOG_SIZE = 1_000_000; // 1 MB
const KEEP_BYTES = 500_000; // keep last 500 KB after rotation

let logFilePath: string | null = null;

function ensureLogFile(): string {
  if (logFilePath) return logFilePath;
  const logDir = app.getPath("logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logFilePath = path.join(logDir, "volley.log");

  // Simple rotation: if file > 1 MB, keep only the last 500 KB
  try {
    const stat = fs.statSync(logFilePath);
    if (stat.size > MAX_LOG_SIZE) {
      const buf = Buffer.alloc(KEEP_BYTES);
      const fd = fs.openSync(logFilePath, "r");
      fs.readSync(fd, buf, 0, KEEP_BYTES, stat.size - KEEP_BYTES);
      fs.closeSync(fd);
      // Find first newline to avoid partial line
      const firstNewline = buf.indexOf(10); // '\n'
      const trimmed = firstNewline >= 0 ? buf.subarray(firstNewline + 1) : buf;
      fs.writeFileSync(logFilePath, trimmed);
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  // Write startup separator
  const version = app.getVersion();
  const separator = `\n${"─".repeat(60)}\n[${new Date().toISOString()}] Volley ${version} started\n${"─".repeat(60)}\n`;
  fs.appendFileSync(logFilePath, separator);

  return logFilePath;
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
}

export function log(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${formatArgs(args)}\n`;
  console.log("[volley]", ...args);
  try {
    fs.appendFileSync(ensureLogFile(), line);
  } catch {
    // Silently ignore write errors
  }
}

export function logError(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ERROR: ${formatArgs(args)}\n`;
  console.error("[volley]", ...args);
  try {
    fs.appendFileSync(ensureLogFile(), line);
  } catch {
    // Silently ignore write errors
  }
}

export function getLogFilePath(): string {
  return ensureLogFile();
}
