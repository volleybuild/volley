import { useState, useEffect, useCallback, useRef } from "react";
import { useUiStore } from "../store/ui-store";

export interface SessionStatusData {
  uncommitted: number;
  unpushed: number;
  behind: number;
  hasConflicts: boolean;
  sourceBranch: string;
}

const POLL_INTERVAL = 10_000;

export function useSessionStatus(sessionId: string | null) {
  const [status, setStatus] = useState<SessionStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const gitActionVersion = useUiStore((s) => s.gitActionVersion);
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    if (!sessionId) {
      setStatus(null);
      return;
    }
    setLoading(true);
    window.volley.git.sessionStatus(sessionId).then((data) => {
      if (mountedRef.current) {
        setStatus(data);
        setLoading(false);
      }
    }).catch(() => {
      if (mountedRef.current) setLoading(false);
    });
  }, [sessionId]);

  // Fetch on mount and when sessionId or gitActionVersion changes
  useEffect(() => {
    refresh();
  }, [refresh, gitActionVersion]);

  // Poll every 10s
  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [sessionId, refresh]);

  // Refetch on window focus
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return { status, loading, refresh };
}
