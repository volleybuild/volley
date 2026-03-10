import React, { useEffect, useState } from "react";
import { useUiStore } from "../../store/ui-store";

interface LineStat {
  files: number;
  insertions: number;
  deletions: number;
}

interface Props {
  sessionId: string;
}

export default function DiffStatFooter({ sessionId }: Props) {
  const [stat, setStat] = useState<LineStat | null>(null);
  const gitActionVersion = useUiStore((s) => s.gitActionVersion);

  useEffect(() => {
    let cancelled = false;
    const fetch = () => {
      window.volley.git.lineStat(sessionId).then((d) => {
        if (!cancelled) setStat(d);
      });
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionId, gitActionVersion]);

  if (!stat || stat.files === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] tabular-nums text-gray-500 border-t border-white/[0.04]">
      <span className="text-gray-600">·</span>
      <span>{stat.files} {stat.files === 1 ? "file" : "files"}</span>
      <span className="text-green-400">+{stat.insertions}</span>
      <span className="text-red-400">-{stat.deletions}</span>
      <span className="text-gray-600">·</span>
    </div>
  );
}
