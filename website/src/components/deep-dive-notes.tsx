"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppFrame } from "./showcase/app-frame";
import { FakeNoteEditor } from "./showcase/fake-note-editor";

export function DeepDiveNotes() {
  const [noteLineCount, setNoteLineCount] = useState(0);
  const [generateVisible, setGenerateVisible] = useState(false);
  const [generateActive, setGenerateActive] = useState(false);
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
    setNoteLineCount(0);
    setGenerateVisible(false);
    setGenerateActive(false);
  }, []);

  const runAnimation = useCallback(() => {
    clearTimeouts();
    resetState();

    schedule(() => setNoteLineCount(1), 400);
    schedule(() => setNoteLineCount(2), 800);
    schedule(() => setNoteLineCount(3), 1200);
    schedule(() => setNoteLineCount(4), 1600);

    schedule(() => setGenerateVisible(true), 2400);
    schedule(() => setGenerateActive(true), 3000);

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
        <FakeNoteEditor
          visibleLines={noteLineCount}
          generateVisible={generateVisible}
          generateActive={generateActive}
        />
      </div>
    </AppFrame>
  );
}
