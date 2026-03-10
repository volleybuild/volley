import * as net from "node:net";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import type { BrowserWindow } from "electron";
import type { PtyManager } from "./pty-manager";

export interface SocketMessage {
  action: "open" | "close" | "ping";
  requestId: string;
  session?: {
    id: string;
    slug: string;
    branch: string;
    baseBranch?: string;
    worktreePath: string;
    task: string;
  };
  sessionId?: string;
}

export interface SocketResponse {
  requestId: string;
  ok: boolean;
  error?: string;
}

export function getSocketPath(repoRoot: string): string {
  const hash = crypto.createHash("sha256").update(repoRoot).digest("hex").slice(0, 12);
  return `/tmp/volley-${hash}.sock`;
}

export class SocketServer {
  private server: net.Server | null = null;
  private socketPath: string;
  private ptyManager: PtyManager;
  private window: BrowserWindow | null = null;

  constructor(repoRoot: string, ptyManager: PtyManager) {
    this.socketPath = getSocketPath(repoRoot);
    this.ptyManager = ptyManager;
  }

  setWindow(win: BrowserWindow): void {
    this.window = win;
  }

  start(): void {
    // Clean up stale socket
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    this.server = net.createServer((conn) => {
      let buffer = "";

      conn.on("data", (chunk) => {
        buffer += chunk.toString();

        // Handle newline-delimited JSON
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg: SocketMessage = JSON.parse(line);
            const response = this.handleMessage(msg);
            conn.write(JSON.stringify(response) + "\n");
          } catch (err) {
            const errorResponse: SocketResponse = {
              requestId: "unknown",
              ok: false,
              error: `Invalid message: ${err}`,
            };
            conn.write(JSON.stringify(errorResponse) + "\n");
          }
        }
      });
    });

    this.server.listen(this.socketPath, () => {
      // Socket server listening
    });

    this.server.on("error", (err) => {
      console.error("Socket server error:", err);
    });
  }

  private handleMessage(msg: SocketMessage): SocketResponse {
    switch (msg.action) {
      case "ping":
        return { requestId: msg.requestId, ok: true };

      case "open": {
        if (!msg.session) {
          return { requestId: msg.requestId, ok: false, error: "Missing session data" };
        }
        const { id, slug, branch, baseBranch, worktreePath, task } = msg.session;
        this.ptyManager.spawn(worktreePath, id);
        this.window?.webContents.send("session:opened", {
          id,
          slug,
          branch,
          baseBranch,
          worktreePath,
          task,
        });
        return { requestId: msg.requestId, ok: true };
      }

      case "close": {
        if (!msg.sessionId) {
          return { requestId: msg.requestId, ok: false, error: "Missing sessionId" };
        }
        this.ptyManager.kill(msg.sessionId);
        this.window?.webContents.send("session:closed", { sessionId: msg.sessionId });
        return { requestId: msg.requestId, ok: true };
      }

      default:
        return { requestId: msg.requestId, ok: false, error: `Unknown action: ${msg.action}` };
    }
  }

  stop(): void {
    this.server?.close();
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }
  }
}
