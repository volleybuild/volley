import { useEffect } from "react";
import { useSessionStore } from "../store/session-store";
import { useProjectStore } from "../store/project-store";
import { useUiStore } from "../store/ui-store";
import { useNoteStore } from "../store/note-store";

let setupWarningShown = false;

export function useIpcListeners() {
  useEffect(() => {
    // Fetch start command from config on init
    useSessionStore.getState().fetchStartCommand();

    // Load notes
    useNoteStore.getState().fetchNotes();

    // Load todo folders
    useSessionStore.getState().fetchTodoFolders();

    // Load planning enabled setting
    window.volley.settings.getUser().then((settings: any) => {
      useUiStore.getState().setPlanningEnabled(!!settings.planning?.enabled);
    });

    // Listen for planning status changes
    window.volley.planning.onStatusChanged(({ sessionId, planStatus, planMarkdown, error }) => {
      useSessionStore.getState().updatePlanStatus(sessionId, planStatus, planMarkdown, error);
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
      store.setStatus(sessionId, "exited");
      store.setExitCode(sessionId, typeof exitCode === "number" ? exitCode : 1);
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
