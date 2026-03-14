import React, { useEffect } from "react";
import { useSessionStore } from "./store/session-store";
import { useUiStore } from "./store/ui-store";
import { useIpcListeners } from "./hooks/use-ipc-listeners";
import { useAgentListeners } from "./hooks/use-agent-listeners";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useElapsedTick } from "./hooks/use-elapsed-tick";
import Sidebar from "./components/layout/Sidebar";
import SessionHeader from "./components/layout/SessionHeader";
import SetupWarningBanner from "./components/layout/SetupWarningBanner";
import EmptyState from "./components/layout/EmptyState";
import TabbedView from "./components/terminal/TabbedView";
import GridView from "./components/terminal/GridView";
import FileViewer from "./components/file-browser/FileViewer";
import SettingsView from "./components/settings/SettingsView";
import NewSessionModal from "./components/modals/NewSessionModal";
import TodoModal from "./components/modals/TodoModal";
import CommitModal from "./components/modals/CommitModal";
import RemoveModal from "./components/modals/RemoveModal";
import LandModal from "./components/modals/LandModal";
import SwitchProjectModal from "./components/modals/SwitchProjectModal";
import ToastContainer from "./components/shared/ToastContainer";
import NoteEditor from "./components/notes/NoteEditor";
import { useProjectStore } from "./store/project-store";
import { useNoteStore } from "./store/note-store";
import SplashScreen from "./components/layout/SplashScreen";

export default function App() {
  const sessions = useSessionStore((s) => s.sessions);
  const gridMode = useSessionStore((s) => s.gridMode);
  const fileViewerOpen = useUiStore((s) => s.fileViewerOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);

  useIpcListeners();
  useAgentListeners();
  useKeyboardShortcuts();
  useElapsedTick();

  // Signal ready to main process, fetch projects, and load theme
  useEffect(() => {
    console.log("[renderer] signaling ready");
    useUiStore.getState().loadTheme();
    useProjectStore.getState().fetchProjects();
    window.volley.ready();
  }, []);

  // Sync file tree base path when active session changes
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const rightPaneView = useUiStore((s) => s.rightPaneView);
  const setFileTreeBasePath = useUiStore((s) => s.setFileTreeBasePath);

  useEffect(() => {
    if (rightPaneView !== "files" || !activeSessionId) return;
    const session = useSessionStore.getState().sessions.get(activeSessionId);
    if (session) {
      setFileTreeBasePath(session.worktreePath);
    }
  }, [activeSessionId, rightPaneView, setFileTreeBasePath]);

  const hasSessions = sessions.size > 0;

  const renderContent = () => {
    if (settingsOpen) return <SettingsView />;
    if (fileViewerOpen) return <FileViewer />;
    if (activeNoteId) return <NoteEditor noteId={activeNoteId} />;
    if (!hasSessions) return <EmptyState />;
    if (gridMode) return <GridView />;
    return <TabbedView />;
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {!settingsOpen && !activeNoteId && <SessionHeader />}
          {!settingsOpen && !activeNoteId && <SetupWarningBanner />}
          {renderContent()}
        </div>
      </div>
      <NewSessionModal />
      <TodoModal />
      <CommitModal />
      <RemoveModal />
      <LandModal />
      <SwitchProjectModal />
      <ToastContainer />
      <SplashScreen />
    </div>
  );
}
