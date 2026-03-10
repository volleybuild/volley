interface AppFrameProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * macOS window chrome — just the rounded container.
 * Traffic lights live inside the sidebar title bar (like the real Electron app
 * with titleBarStyle: "hiddenInset").
 */
export function AppFrame({ children, className = "" }: AppFrameProps) {
  return (
    <div
      className={`rounded-xl border border-vo-border bg-vo-surface overflow-hidden shadow-2xl shadow-black/50 ${className}`}
    >
      {children}
    </div>
  );
}
