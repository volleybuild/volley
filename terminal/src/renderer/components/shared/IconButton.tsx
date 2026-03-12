import React from "react";

interface Props {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  /** "sm" = 20px (inline/row actions), "md" = 24px (header actions). Default: "sm" */
  size?: "sm" | "md";
  /** "default" = gray hover, "danger" = red hover */
  variant?: "default" | "danger";
  /** Extra class names (e.g. "hidden group-hover:flex") */
  className?: string;
}

const SIZE = { sm: "w-5 h-5", md: "w-6 h-6" } as const;
const VARIANT = {
  default: "text-gray-500 hover:text-gray-300 hover:bg-white/[0.08]",
  danger: "text-gray-500 hover:text-red-400 hover:bg-red-500/15",
} as const;

export default function IconButton({
  onClick,
  title,
  children,
  size = "sm",
  variant = "default",
  className = "",
}: Props) {
  return (
    <button
      className={`flex items-center justify-center rounded transition-colors flex-shrink-0 ${SIZE[size]} ${VARIANT[variant]} ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
