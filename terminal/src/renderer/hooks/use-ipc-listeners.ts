import { useEffect } from "react";
import { useSessionStore } from "../store/session-store";
import { useProjectStore } from "../store/project-store";
import { useUiStore } from "../store/ui-store";

let setupWarningShown = false;

export function useIpcListeners() {
  useEffect(() => {
    // Fetch start command from config on init
    useSessionStore.getState().fetchStartCommand();

    // Listen for project switches
    window.volley.project.onSwitched(() => {
      useSessionStore.getState().clearAllSessions();
      useSessionStore.getState().fetchStartCommand();
      useProjectStore.getState().fetchProjects();
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
