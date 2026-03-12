import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useProjectStore } from "../../store/project-store";
import { useSessionStore } from "../../store/session-store";
import { useUiStore } from "../../store/ui-store";

export default function ProjectDropdown() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const dropdownOpen = useProjectStore((s) => s.dropdownOpen);
  const setDropdownOpen = useProjectStore((s) => s.setDropdownOpen);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const addToast = useUiStore((s) => s.addToast);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Position the portal menu below the trigger button
  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) return;
      setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [dropdownOpen, setDropdownOpen]);

  const handleSwitch = (projectId: string) => {
    if (projectId === activeProjectId) {
      setDropdownOpen(false);
      return;
    }
    setDropdownOpen(false);

    // Check for running sessions
    const sessions = useSessionStore.getState().sessions;
    const hasRunning = Array.from(sessions.values()).some(
      (s) => s.status === "running" || s.status === "pending"
    );

    if (hasRunning) {
      useUiStore.getState().openSwitchProjectModal(projectId);
    } else {
      window.volley.project.switch(projectId);
    }
  };

  const handleRemove = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const result = await window.volley.project.remove(projectId);
    if (result.ok) {
      await fetchProjects();
    } else {
      addToast(result.error || "Failed to remove project", "error");
    }
  };

  const handleAdd = async () => {
    setDropdownOpen(false);
    const { path } = await window.volley.project.pickFolder();
    if (!path) return;

    const addResult = await window.volley.project.add(path);
    if (!addResult.ok) {
      addToast(addResult.error || "Failed to add project", "error");
      return;
    }

    await fetchProjects();

    // Auto-switch to the new project and open settings for review
    if (addResult.project) {
      const sessions = useSessionStore.getState().sessions;
      const hasRunning = Array.from(sessions.values()).some(
        (s) => s.status === "running" || s.status === "pending"
      );

      if (hasRunning) {
        useUiStore.getState().openSwitchProjectModal(addResult.project.id);
      } else {
        window.volley.project.switch(addResult.project.id);
        useUiStore.getState().openSettings();
      }
    }
  };

  if (projects.length === 0) return null;

  const dropdownMenu = dropdownOpen
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed w-64 rounded-lg overflow-hidden z-[9999]"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            background: "linear-gradient(180deg, #111114 0%, #0c0c0e 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 12px 32px -8px rgba(0,0,0,0.7)",
          }}
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleSwitch(project.id)}
                className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  project.id === activeProjectId
                    ? "bg-accent-bright/[0.08] text-accent-bright"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{project.name}</div>
                  <div className="text-[11px] text-gray-600 truncate">{project.path}</div>
                </div>
                {project.id !== activeProjectId && (
                  <button
                    onClick={(e) => handleRemove(e, project.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2 w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-white/[0.06] transition-all cursor-pointer border-none bg-transparent"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04]">
            <button
              onClick={handleAdd}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] cursor-pointer transition-colors border-none bg-transparent"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add project...
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="titlebar-no-drag">
      <button
        ref={triggerRef}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-200 transition-colors cursor-pointer bg-transparent border-none px-1 py-0.5 rounded hover:bg-white/[0.04]"
      >
        <span className="truncate max-w-[120px]">{activeProject?.name ?? "No project"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {dropdownMenu}
    </div>
  );
}
