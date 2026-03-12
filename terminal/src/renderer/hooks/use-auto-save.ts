import { useRef, useCallback, useEffect } from "react";
import { useNoteStore } from "../store/note-store";

export function useAutoSave(noteId: string, delay = 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (content: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        useNoteStore.getState().updateNote(noteId, { content });
        timerRef.current = null;
      }, delay);
    },
    [noteId, delay],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return flush;
  }, [flush]);

  return { save, flush };
}
