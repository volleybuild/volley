import { useEffect } from "react";
import { useAgentStore } from "../store/agent-store";
import type { AgentMessage } from "../types/agent";
import { playSound } from "../services/sound-service";

/** Parse an SDK message into renderer-friendly AgentMessage(s) */
export function parseSDKMessage(sdkMsg: any): AgentMessage[] {
  const messages: AgentMessage[] = [];

  if (sdkMsg.type === "assistant") {
    const content = sdkMsg.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && block.text) {
          messages.push({ type: "text", content: block.text });
        } else if (block.type === "tool_use") {
          messages.push({
            type: "tool_use",
            name: block.name,
            input: block.input || {},
            id: block.id,
          });
        }
      }
    }
  } else if (sdkMsg.type === "user") {
    // Tool results come back as user messages
    const content = sdkMsg.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_result") {
          const text = Array.isArray(block.content)
            ? block.content.map((c: any) => c.text || "").join("\n")
            : typeof block.content === "string" ? block.content : "";
          messages.push({
            type: "tool_result",
            id: block.tool_use_id,
            content: text,
          });
        }
      }
    }
  } else if (sdkMsg.type === "result") {
    messages.push({
      type: "done",
      costUsd: sdkMsg.total_cost_usd,
      durationMs: sdkMsg.duration_ms,
    });
  } else if (sdkMsg.type === "stream_event") {
    // Partial streaming — extract text deltas
    const event = sdkMsg.event;
    if (event?.type === "content_block_delta" && event.delta?.type === "text_delta") {
      // We accumulate partial text. The store handles replacement.
      messages.push({
        type: "text",
        content: event.delta.text,
        partial: true,
      });
    }
  }

  return messages;
}

/** Derive agent status from a message */
function deriveStatus(sdkMsg: any): "thinking" | "coding" | "waiting" | "done" | "idle" | "error" | null {
  if (sdkMsg.type === "assistant") {
    const content = sdkMsg.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") {
          // Check if this is an AskUserQuestion tool - agent is waiting for user input
          if (block.name === "AskUserQuestion") return "waiting";
          return "coding";
        }
      }
    }
    return "thinking";
  }
  if (sdkMsg.type === "result") return "done";
  if (sdkMsg.type === "stream_event") {
    const event = sdkMsg.event;
    // Check if this is a tool use block starting
    if (event?.type === "content_block_start" && event.content_block?.type === "tool_use") {
      // Check if it's AskUserQuestion
      if (event.content_block?.name === "AskUserQuestion") return "waiting";
      return "coding";
    }
    // Check for tool use input deltas (streaming tool arguments)
    if (event?.type === "content_block_delta" && event.delta?.type === "input_json_delta") {
      return "coding";
    }
    // Text deltas mean thinking/generating text
    return "thinking";
  }
  return null;
}

export function useAgentListeners() {
  useEffect(() => {
    window.volley.agent.onMessage(({ sessionId, message }) => {
      const store = useAgentStore.getState();

      // Parse and add messages
      const parsed = parseSDKMessage(message);
      for (const msg of parsed) {
        store.addMessage(sessionId, msg);
      }

      // Update status
      const status = deriveStatus(message);
      if (status) {
        const prevStatus = store.status[sessionId];
        store.setStatus(sessionId, status);
        if (status === "waiting" && prevStatus !== "waiting") playSound("agentWaiting");
      }
    });

    window.volley.agent.onDone(({ sessionId }) => {
      useAgentStore.getState().setStatus(sessionId, "idle");
      playSound("agentDone");
    });

    window.volley.agent.onError(({ sessionId, error }) => {
      const store = useAgentStore.getState();
      store.addMessage(sessionId, { type: "error", message: error });
      store.setStatus(sessionId, "error");
    });
  }, []);
}
