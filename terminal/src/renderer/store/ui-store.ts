import { create } from "zustand";
import type { Toast } from "./types";

let toastIdCounter = 0;

interface UiStore {
  fileTreeBasePath: string;
  fileViewerOpen: boolean;
  fileViewerPath: string;
  fileViewerContent: string;
  fileViewerSize: string;
  newSessionModalOpen: boolean;
  commitModalOpen: boolean;
  commitFileCount: number;
  commitSessionId: string | null;
  removeModalOpen: boolean;
  removeSessionId: string | null;
  removeDirty: boolean;
  removeFileCount: number;
  removeUnpushedCount: number;
  landModalOpen: boolean;
  landSessionId: string | null;
  landBaseBranch: string;
  landSessionBranch: string;
  toasts: Toast[];
  activeFilePath: string | null;
  gitActionVersion: number;
  rightPaneView: "files" | "run" | "changes" | "diff" | "pr" | "terminal" | null;
  diffFilePath: string | null;
  diffStaged: boolean;
  settingsOpen: boolean;
  rightPaneWidth: number;
  sidebarWidth: number;
  sidebarSections: {
    notes: boolean;
    archivedNotes: boolean;
    todo: boolean;
    inProgress: boolean;
    completed: boolean;
  };
  switchProjectModalOpen: boolean;
  switchProjectTargetId: string | null;
  todoModalOpen: boolean;
  todoFilterType: "all" | "bug" | "feature" | "improvement";
  todoViewMode: "list" | "type";
  collapsedFolders: Set<string>;
  planningEnabled: boolean;

  setFileTreeBasePath: (basePath: string) => void;
  toggleSidebarSection: (section: "notes" | "archivedNotes" | "todo" | "inProgress" | "completed") => void;
  setRightPaneWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  openFileViewer: (path: string, content: string, size: string) => void;
  closeFileViewer: () => void;
  openNewSessionModal: () => void;
  closeNewSessionModal: () => void;
  openCommitModal: (sessionId: string, fileCount: number) => void;
  closeCommitModal: () => void;
  openRemoveModal: (sessionId: string, dirty: boolean, fileCount: number, unpushedCount?: number) => void;
  closeRemoveModal: () => void;
  openLandModal: (sessionId: string, baseBranch: string, sessionBranch: string) => void;
  closeLandModal: () => void;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: number) => void;
  setActiveFilePath: (path: string | null) => void;
  bumpGitAction: () => void;
  setRightPaneView: (view: "files" | "run" | "changes" | "diff" | "pr" | "terminal" | null) => void;
  openDiff: (filePath: string, staged: boolean) => void;
  closeDiff: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openSwitchProjectModal: (projectId: string) => void;
  closeSwitchProjectModal: () => void;
  openTodoModal: () => void;
  closeTodoModal: () => void;
  setTodoFilterType: (type: "all" | "bug" | "feature" | "improvement") => void;
  setTodoViewMode: (mode: "list" | "type") => void;
  toggleFolder: (folderId: string) => void;
  setPlanningEnabled: (enabled: boolean) => void;
}

function createUiStore() {
  return create<UiStore>((set, get) => ({
  fileTreeBasePath: "",
  fileViewerOpen: false,
  fileViewerPath: "",
  fileViewerContent: "",
  fileViewerSize: "",
  newSessionModalOpen: false,
  commitModalOpen: false,
  commitFileCount: 0,
  commitSessionId: null,
  removeModalOpen: false,
  removeSessionId: null,
  removeDirty: false,
  removeFileCount: 0,
  removeUnpushedCount: 0,
  landModalOpen: false,
  landSessionId: null,
  landBaseBranch: "main",
  landSessionBranch: "",
  toasts: [],
  activeFilePath: null,
  gitActionVersion: 0,
  rightPaneView: null,
  diffFilePath: null,
  diffStaged: false,
  settingsOpen: false,
  switchProjectModalOpen: false,
  switchProjectTargetId: null,
  todoModalOpen: false,
  todoFilterType: "all" as const,
  todoViewMode: "list" as const,
  collapsedFolders: new Set<string>(),
  planningEnabled: false,
  rightPaneWidth: 450,
  sidebarWidth: 260,
  sidebarSections: {
    notes: true,
    archivedNotes: false,
    todo: true,
    inProgress: true,
    completed: false,
  },

  setFileTreeBasePath: (basePath) => set({ fileTreeBasePath: basePath }),
  toggleSidebarSection: (section) =>
    set((state) => ({
      sidebarSections: {
        ...state.sidebarSections,
        [section]: !state.sidebarSections[section],
      },
    })),
  setRightPaneWidth: (width) => set({ rightPaneWidth: Math.max(260, Math.min(800, width)) }),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(400, width)) }),

  openFileViewer: (path, content, size) =>
    set({ fileViewerOpen: true, fileViewerPath: path, fileViewerContent: content, fileViewerSize: size }),
  closeFileViewer: () =>
    set({ fileViewerOpen: false, fileViewerPath: "", fileViewerContent: "", fileViewerSize: "" }),

  openNewSessionModal: () => set({ newSessionModalOpen: true }),
  closeNewSessionModal: () => set({ newSessionModalOpen: false }),

  openCommitModal: (sessionId, fileCount) =>
    set({ commitModalOpen: true, commitSessionId: sessionId, commitFileCount: fileCount }),
  closeCommitModal: () =>
    set({ commitModalOpen: false, commitSessionId: null }),

  openRemoveModal: (sessionId, dirty, fileCount, unpushedCount = 0) =>
    set({ removeModalOpen: true, removeSessionId: sessionId, removeDirty: dirty, removeFileCount: fileCount, removeUnpushedCount: unpushedCount }),
  closeRemoveModal: () =>
    set({ removeModalOpen: false, removeSessionId: null }),

  openLandModal: (sessionId, baseBranch, sessionBranch) =>
    set({ landModalOpen: true, landSessionId: sessionId, landBaseBranch: baseBranch, landSessionBranch: sessionBranch }),
  closeLandModal: () =>
    set({ landModalOpen: false, landSessionId: null, landSessionBranch: "" }),

  addToast: (message, type) => {
    const id = ++toastIdCounter;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setActiveFilePath: (path) => set({ activeFilePath: path }),

  bumpGitAction: () => set((state) => ({ gitActionVersion: state.gitActionVersion + 1 })),

  setRightPaneView: (view) => set({ rightPaneView: view }),
  openDiff: (filePath, staged) => set({ rightPaneView: "diff", diffFilePath: filePath, diffStaged: staged }),
  closeDiff: () => set({ rightPaneView: "changes", diffFilePath: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openSwitchProjectModal: (projectId) => set({ switchProjectModalOpen: true, switchProjectTargetId: projectId }),
  closeSwitchProjectModal: () => set({ switchProjectModalOpen: false, switchProjectTargetId: null }),
  openTodoModal: () => set({ todoModalOpen: true }),
  closeTodoModal: () => set({ todoModalOpen: false }),
  setTodoFilterType: (type) => set({ todoFilterType: type }),
  setTodoViewMode: (mode) => set({ todoViewMode: mode }),
  toggleFolder: (folderId) => set((state) => {
    const next = new Set(state.collapsedFolders);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    return { collapsedFolders: next };
  }),
  setPlanningEnabled: (enabled) => set({ planningEnabled: enabled }),
}));
}

// Preserve store across Vite HMR
export const useUiStore: ReturnType<typeof createUiStore> =
  import.meta.hot?.data?.store ?? createUiStore();

if (import.meta.hot) {
  import.meta.hot.data.store = useUiStore;
  import.meta.hot.accept();
}
