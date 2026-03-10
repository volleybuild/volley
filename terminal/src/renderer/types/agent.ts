export type AgentStatus = "idle" | "thinking" | "coding" | "waiting" | "done" | "error";

export type AgentMessage =
  | { type: "user"; content: string; images?: { base64: string; mediaType: string }[] }
  | { type: "text"; content: string; partial?: boolean }
  | { type: "tool_use"; name: string; input: Record<string, any>; id: string }
  | { type: "tool_result"; id: string; content: string }
  | { type: "error"; message: string }
  | { type: "done"; costUsd?: number; durationMs?: number };
