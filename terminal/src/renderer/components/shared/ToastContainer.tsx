import React from "react";
import { useUiStore } from "../../store/ui-store";
import Toast from "./Toast";

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  // Show only the latest toast (they stack at the same position anyway)
  const latest = toasts[toasts.length - 1];

  return <Toast toast={latest} />;
}
