import { create } from "zustand";

interface ProjectStore {
  projects: VolleyProject[];
  activeProjectId: string | null;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  fetchProjects: () => Promise<void>;
}

function createProjectStore() {
  return create<ProjectStore>((set) => ({
    projects: [],
    activeProjectId: null,
    dropdownOpen: false,

    setDropdownOpen: (open) => set({ dropdownOpen: open }),

    fetchProjects: async () => {
      const { projects, activeProjectId } = await window.volley.project.list();
      set({ projects, activeProjectId });
    },
  }));
}

// Preserve store across Vite HMR
export const useProjectStore: ReturnType<typeof createProjectStore> =
  (import.meta as any).hot?.data?.projectStore ?? createProjectStore();

if ((import.meta as any).hot) {
  (import.meta as any).hot.data.projectStore = useProjectStore;
  (import.meta as any).hot.accept();
}
