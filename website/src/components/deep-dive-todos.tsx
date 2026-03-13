"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppFrame } from "./showcase/app-frame";
import { FakeTodoPlan } from "./showcase/fake-todo-plan";

export function DeepDiveTodos() {
  const [planItemCount, setPlanItemCount] = useState(0);
  const [startingIndex, setStartingIndex] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const resetState = useCallback(() => {
    setPlanItemCount(0);
    setStartingIndex(null);
  }, []);

  const runAnimation = useCallback(() => {
    clearTimeouts();
    resetState();

    // Items appear with stagger
    schedule(() => setPlanItemCount(1), 300);
    schedule(() => setPlanItemCount(2), 550);
    schedule(() => setPlanItemCount(3), 800);
    schedule(() => setPlanItemCount(4), 1050);

    // First item highlights
    schedule(() => setStartingIndex(0), 2200);

    // Second item highlights
    schedule(() => setStartingIndex(1), 3500);

    // Loop
    schedule(() => runAnimation(), 5500);
  }, [clearTimeouts, resetState, schedule]);

  useEffect(() => {
    runAnimation();
    return () => clearTimeouts();
  }, [runAnimation, clearTimeouts]);

  return (
    <AppFrame>
      <div className="h-[280px] flex flex-col overflow-hidden">
        <FakeTodoPlan
          visibleItems={planItemCount}
          startingIndex={startingIndex}
        />
      </div>
    </AppFrame>
  );
}
