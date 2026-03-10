import { create } from "zustand";
import type { AgentMessage, AgentStatus } from "../types/agent";

interface AgentStore {
  messages: Record<string, AgentMessage[]>;
  status: Record<string, AgentStatus>;
  historyLoaded: Record<string, boolean>;

  addMessage(sessionId: string, msg: AgentMessage): void;
  setStatus(sessionId: string, status: AgentStatus): void;
  loadHistory(sessionId: string, messages: AgentMessage[]): void;
  clearMessages(sessionId: string): void;
  markHistoryLoaded(sessionId: string): void;
}

const EMPTY_MESSAGES: AgentMessage[] = [];

function createAgentStore() {
  return create<AgentStore>((set, get) => ({
  messages: {},
  status: {},
  historyLoaded: {},

  addMessage: (sessionId, msg) => {
    const { messages } = get();
    const existing = messages[sessionId] || [];

    // For partial text messages, append the delta to the last partial message
    if (msg.type === "text" && msg.partial) {
      const last = existing[existing.length - 1];
      if (last && last.type === "text" && last.partial) {
        const updatedMsg = { ...last, content: last.content + msg.content };
        set({ messages: { ...messages, [sessionId]: [...existing.slice(0, -1), updatedMsg] } });
        return;
      }
    }

    // If we get a non-partial text and last was partial, replace it
    if (msg.type === "text" && !msg.partial) {
      const last = existing[existing.length - 1];
      if (last && last.type === "text" && last.partial) {
        set({ messages: { ...messages, [sessionId]: [...existing.slice(0, -1), msg] } });
        return;
      }
    }

    set({ messages: { ...messages, [sessionId]: [...existing, msg] } });
  },

  setStatus: (sessionId, status) => {
    set({ status: { ...get().status, [sessionId]: status } });
  },

  loadHistory: (sessionId, msgs) => {
    set({
      messages: { ...get().messages, [sessionId]: msgs },
      historyLoaded: { ...get().historyLoaded, [sessionId]: true },
    });
  },

  markHistoryLoaded: (sessionId) => {
    set({ historyLoaded: { ...get().historyLoaded, [sessionId]: true } });
  },

  clearMessages: (sessionId) => {
    const { messages, status, historyLoaded } = get();
    const nextMessages = { ...messages };
    delete nextMessages[sessionId];
    const nextStatus = { ...status };
    delete nextStatus[sessionId];
    const nextHistory = { ...historyLoaded };
    delete nextHistory[sessionId];
    set({ messages: nextMessages, status: nextStatus, historyLoaded: nextHistory });
  },
}));
}

// Preserve store across Vite HMR
export const useAgentStore: ReturnType<typeof createAgentStore> =
  import.meta.hot?.data?.store ?? createAgentStore();

if (import.meta.hot) {
  import.meta.hot.data.store = useAgentStore;
  import.meta.hot.accept();
}
