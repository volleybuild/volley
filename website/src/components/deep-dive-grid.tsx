"use client";

import { useEffect, useRef, useState } from "react";
import { SHOWCASE_AGENT_FLOWS } from "@/lib/constants";
import { AppFrame } from "./showcase/app-frame";
import { FakeGridView } from "./showcase/fake-grid-view";

export function DeepDiveGrid() {
  const [statuses, setStatuses] = useState<
    ("pending" | "running" | "idle" | "done")[]
  >(["pending", "pending", "pending", "pending"]);
  const [msgCounts, setMsgCounts] = useState([0, 0, 0, 0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start running after 500ms
    const t1 = setTimeout(() => {
      setStatuses(["running", "running", "running", "running"]);

      // Stream messages in
      const maxLens = SHOWCASE_AGENT_FLOWS.map((f) => f.length);
      const counters = [0, 0, 0, 0];
      let tick = 0;

      intervalRef.current = setInterval(() => {
        tick++;
        for (let i = 0; i < 4; i++) {
          if (
            tick >= i + 1 &&
            (tick - (i + 1)) % 2 === 0 &&
            counters[i] < maxLens[i]
          ) {
            counters[i]++;
          }
        }
        setMsgCounts([...counters]);

        if (counters.every((c, i) => c >= maxLens[i])) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 400);
    }, 500);

    // One completes
    const t2 = setTimeout(() => {
      setStatuses(["running", "done", "running", "running"]);
    }, 5000);

    // Another completes
    const t3 = setTimeout(() => {
      setStatuses(["running", "done", "done", "running"]);
    }, 6500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <AppFrame>
      <div className="h-[260px]">
        <FakeGridView
          visibleMsgCounts={msgCounts}
          statuses={statuses}
        />
      </div>
    </AppFrame>
  );
}
