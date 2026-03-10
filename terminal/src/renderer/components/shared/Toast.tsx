import React from "react";
import type { Toast as ToastType } from "../../store/types";

const TYPE_CLASSES: Record<string, string> = {
  success: "bg-green-500/15 border border-green-500/30 text-green-400",
  error: "bg-red-500/15 border border-red-500/30 text-red-400",
  info: "bg-accent/15 border border-accent/30 text-accent-bright",
};

interface Props {
  toast: ToastType;
}

export default function Toast({ toast }: Props) {
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 text-xs px-3.5 py-1.5 rounded-md z-[100] animate-toast-in pointer-events-none max-w-[80vw] truncate ${TYPE_CLASSES[toast.type] ?? ""}`}>
      {toast.message}
    </div>
  );
}
