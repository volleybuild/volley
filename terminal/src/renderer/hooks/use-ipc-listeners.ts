import { useEffect } from "react";
import { useSessionStore } from "../store/session-store";
import { useProjectStore } from "../store/project-store";
import { useNoteStore } from "../store/note-store";
import { useUiStore } from "../store/ui-store";
import { playSound } from "../services/sound-service";

let setupWarningShown = false;
let soundReady = false;

export function useIpcListeners() {
  useEffect(() => {
    // Load sound settings, delay enabling sounds so startup session restores are silent
    useUiStore.getState().loadSoundSettings();
    soundReady = false;
    setTimeout(() => { soundReady = true; }, 3000);

    // Fetch all initial data, then mark the app ready
    Promise.all([
      window.volley.config.getStartCommand().then(({ command }) => {
        useSessionStore.setState({ startCommand: command });
      }),
      useNoteStore.getState().fetchNotes(),
      useSessionStore.getState().fetchTodoFolders(),
    ]).finally(() => {
      useUiStore.getState().setAppReady();
    });

    // Listen for project switches
    window.volley.project.onSwitched(() => {
      useSessionStore.getState().clearAllSessions();
      useSessionStore.getState().fetchStartCommand();
      useProjectStore.getState().fetchProjects();
      useNoteStore.getState().clearNotes();
      useNoteStore.getState().fetchNotes();
      useSessionStore.getState().fetchTodoFolders();
      setupWarningShown = false;
    });

    window.volley.pty.onData(({ sessionId, data }) => {
      useSessionStore.getState().sessions.get(sessionId)?.terminal.write(data);
    });

    window.volley.pty.onExit(({ sessionId, exitCode }) => {
      const store = useSessionStore.getState();
      const session = store.sessions.get(sessionId);
      // Ignore exit events for paused sessions — the PTY was killed intentionally
      if (session?.status === "paused") return;
      store.setStatus(sessionId, "exited");
      const code = typeof exitCode === "number" ? exitCode : 1;
      store.setExitCode(sessionId, code);
      if (code !== 0) playSound("sessionError");
    });

    window.volley.session.onPending(({ pendingId, task }) => {
      console.log("[renderer] session:pending", pendingId, task);
      useSessionStore.getState().addPendingSession(pendingId, task);

      // Warn once per project if no setup commands are configured
      if (!setupWarningShown) {
        setupWarningShown = true;
        window.volley.settings.getProject().then((config: any) => {
          if (!config.setup || config.setup.length === 0) {
            useUiStore.getState().addToast(
              "No setup commands configured — sessions may be missing dependencies. Check Settings.",
              "info",
            );
          }
        });
      }
    });

    window.volley.session.onSetupOutput(({ pendingId, data }) => {
      useSessionStore.getState().writePendingOutput(pendingId, data);
    });

    window.volley.session.onSetupFailed(({ pendingId, error }) => {
      console.log("[renderer] session:setup-failed", pendingId, error);
      useSessionStore.getState().setPendingFailed(pendingId, error);
      playSound("sessionError");
    });

    window.volley.session.onSetupWarning(({ task, error }) => {
      console.log("[renderer] session:setup-warning", task, error);
      // Match task name to session — the session may have just been added
      const slugify = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");
      const sessions = useSessionStore.getState().sessions;
      for (const [id, s] of sessions) {
        if (slugify(s.task) === slugify(task) || id === slugify(task)) {
          useSessionStore.getState().setSetupWarning(id, error);
          break;
        }
      }
    });

    window.volley.session.onOpened((session) => {
      console.log("[renderer] session:opened", session);
      useSessionStore.getState().addSession(session);
      if (soundReady) playSound("sessionStarted");
    });

    window.volley.session.onAutoStart(({ sessionId }) => {
      console.log("[renderer] session:auto-start", sessionId);
      window.volley.agent.send(sessionId, "Begin planning this task.");
    });

    window.volley.session.onClosed(({ sessionId }) => {
      useSessionStore.getState().removeSession(sessionId);
    });

    window.volley.run.onData(({ sessionId, data }) => {
      useSessionStore.getState().sessions.get(sessionId)?.runTerminal?.write(data);
    });

    window.volley.run.onExit(({ sessionId, exitCode }) => {
      useSessionStore.getState().setRunStatus(sessionId, "exited", typeof exitCode === "number" ? exitCode : 1);
    });
  }, []);
}
