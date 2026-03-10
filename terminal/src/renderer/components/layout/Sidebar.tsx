import React, { useRef, useCallback } from "react";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";
import TabItem from "../sidebar/TabItem";
import SidebarSection from "../sidebar/SidebarSection";
import ProjectDropdown from "../sidebar/ProjectDropdown";

export default function Sidebar() {
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const focusSession = useSessionStore((s) => s.focusSession);
  const gridMode = useSessionStore((s) => s.gridMode);
  const toggleGridMode = useSessionStore((s) => s.toggleGridMode);
  const openNewSessionModal = useUiStore((s) => s.openNewSessionModal);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const sidebarSections = useUiStore((s) => s.sidebarSections);
  const toggleSidebarSection = useUiStore((s) => s.toggleSidebarSection);
  const addToast = useUiStore((s) => s.addToast);

  // Group sessions by lifecycle
  const sessionArray = Array.from(sessions.values());
  const todoSessions = sessionArray.filter((s) => s.lifecycle === "todo");
  const inProgressSessions = sessionArray.filter(
    (s) => s.lifecycle === "in_progress" || (!s.lifecycle && s.status !== "exited")
  );
  const completedSessions = sessionArray.filter((s) => s.lifecycle === "completed");

  const handleAddTodo = async (task: string) => {
    try {
      const result = await window.volley.session.createTodo(task);
      if (!result.ok) {
        addToast(result.error || "Failed to create todo", "error");
      }
    } catch (e: any) {
      addToast(e.message || "Failed to create todo", "error");
    }
  };

  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setSidebarWidth(e.clientX);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [setSidebarWidth]);

  return (
    <div
      style={{ width: sidebarWidth }}
      className="flex-shrink-0 bg-vo-surface flex flex-col overflow-hidden relative z-10"
    >
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px hover:w-1 bg-white/[0.06] hover:bg-accent-bright/30 cursor-col-resize transition-all z-20"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
      <div className="titlebar-drag pl-20 pr-2 h-9 flex items-center justify-between flex-shrink-0">
        <span className="text-gray-500 text-[11px] tracking-wide flex items-center gap-1.5">
          <svg
            width="16"
            height="14"
            viewBox="0 0 48 40"
            fill="none"
            className="text-accent-bright"
          >
            <path d="M8 4L24 20L8 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
            <path d="M18 4L34 20L18 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d="M28 4L44 20L28 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <ProjectDropdown />
        </span>
      </div>
      <div className="px-3 py-1.5 flex-shrink-0 flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-widest text-gray-600 uppercase">Sessions</span>
        <button
          className={`titlebar-no-drag flex items-center justify-center w-5 h-5 rounded transition-colors duration-150 border-none cursor-pointer ${
            gridMode
              ? "text-gray-200 bg-white/[0.08] ring-1 ring-accent-bright/30 hover:bg-white/[0.10]"
              : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.06]"
          }`}
          title="Grid mode (⌘G)"
          onClick={toggleGridMode}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5">
        {/* Todo Section */}
        {(todoSessions.length > 0 || sidebarSections.todo) && (
          <SidebarSection
            title="Todo"
            count={todoSessions.length}
            expanded={sidebarSections.todo}
            onToggle={() => toggleSidebarSection("todo")}
            onAddItem={handleAddTodo}
          >
            {todoSessions.map((session) => (
              <TabItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => focusSession(session.id)}
              />
            ))}
          </SidebarSection>
        )}

        {/* In Progress Section */}
        <SidebarSection
          title="In Progress"
          count={inProgressSessions.length}
          expanded={sidebarSections.inProgress}
          onToggle={() => toggleSidebarSection("inProgress")}
        >
          {inProgressSessions.map((session) => (
            <TabItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onClick={() => focusSession(session.id)}
            />
          ))}
        </SidebarSection>

        {/* Completed Section */}
        {completedSessions.length > 0 && (
          <SidebarSection
            title="Completed"
            count={completedSessions.length}
            expanded={sidebarSections.completed}
            onToggle={() => toggleSidebarSection("completed")}
            dimmed
          >
            {completedSessions.map((session) => (
              <TabItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => focusSession(session.id)}
              />
            ))}
          </SidebarSection>
        )}
      </div>
      <div className="px-3 py-2.5 flex-shrink-0 space-y-1.5">
        <button
          className="titlebar-no-drag w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] cursor-pointer transition-colors duration-75 border border-white/[0.06]"
          title="New session (⌘N)"
          onClick={openNewSessionModal}
        >
          + New session
        </button>
        <button
          className="titlebar-no-drag w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] cursor-pointer transition-colors duration-75"
          title="Settings"
          onClick={() => useUiStore.getState().openSettings()}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}
