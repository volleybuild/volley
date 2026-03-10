import * as pty from "node-pty";
import type { BrowserWindow } from "electron";

interface ManagedPty {
  process: pty.IPty;
  sessionId: string;
}

export class PtyManager {
  private ptys = new Map<string, ManagedPty>();
  private window: BrowserWindow | null = null;

  setWindow(win: BrowserWindow): void {
    this.window = win;
  }

  spawn(cwd: string, sessionId: string): void {
    if (this.ptys.has(sessionId)) {
      return;
    }

    const shell = process.env.SHELL || "/bin/bash";
    const proc = pty.spawn(shell, [], {
      name: "xterm-256color",
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        VOLLEY_SESSION: sessionId,
      },
      cols: 80,
      rows: 24,
    });

    const managed: ManagedPty = { process: proc, sessionId };
    this.ptys.set(sessionId, managed);

    proc.onData((data: string) => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send("pty:data", { sessionId, data });
      }
    });

    proc.onExit(({ exitCode, signal }) => {
      this.ptys.delete(sessionId);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send("pty:exit", { sessionId, exitCode, signal });
      }
    });
  }

  write(sessionId: string, data: string): void {
    this.ptys.get(sessionId)?.process.write(data);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    if (cols > 0 && rows > 0) {
      this.ptys.get(sessionId)?.process.resize(cols, rows);
    }
  }

  kill(sessionId: string): void {
    const managed = this.ptys.get(sessionId);
    if (managed) {
      try { managed.process.kill(); } catch {}
      this.ptys.delete(sessionId);
    }
  }

  killAll(): void {
    for (const [id, managed] of this.ptys) {
      try { managed.process.kill(); } catch {}
    }
    this.ptys.clear();
  }

  has(sessionId: string): boolean {
    return this.ptys.has(sessionId);
  }

  // ── Run terminals ──────────────────────────────────────────────────────

  private runKey(sessionId: string): string {
    return `run:${sessionId}`;
  }

  spawnRun(cwd: string, sessionId: string, command: string): void {
    const key = this.runKey(sessionId);
    // Kill existing run PTY if any
    this.killRun(sessionId);

    const shell = process.env.SHELL || "/bin/bash";
    const proc = pty.spawn(shell, ["-c", command], {
      name: "xterm-256color",
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        VOLLEY_SESSION: sessionId,
        VOLLEY_RUN: "1",
      },
      cols: 80,
      rows: 24,
    });

    const managed: ManagedPty = { process: proc, sessionId };
    this.ptys.set(key, managed);

    proc.onData((data: string) => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send("run:data", { sessionId, data });
      }
    });

    proc.onExit(({ exitCode, signal }) => {
      this.ptys.delete(key);
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send("run:exit", { sessionId, exitCode, signal });
      }
    });
  }

  writeRun(sessionId: string, data: string): void {
    this.ptys.get(this.runKey(sessionId))?.process.write(data);
  }

  resizeRun(sessionId: string, cols: number, rows: number): void {
    if (cols > 0 && rows > 0) {
      this.ptys.get(this.runKey(sessionId))?.process.resize(cols, rows);
    }
  }

  killRun(sessionId: string): void {
    const key = this.runKey(sessionId);
    const managed = this.ptys.get(key);
    if (managed) {
      try { managed.process.kill(); } catch {}
      this.ptys.delete(key);
    }
  }

  hasRun(sessionId: string): boolean {
    return this.ptys.has(this.runKey(sessionId));
  }
}
