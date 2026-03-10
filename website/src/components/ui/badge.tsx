interface BadgeProps {
  children: React.ReactNode;
  color?: "mint" | "cyan" | "amber" | "red" | "gray";
  className?: string;
}

const colorMap = {
  mint: "text-accent-bright bg-accent-bright/15 border-accent-bright/30",
  cyan: "text-accent-cyan bg-accent-cyan/15 border-accent-cyan/30",
  amber: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  red: "text-red-400 bg-red-500/15 border-red-500/30",
  gray: "text-gray-400 bg-white/10 border-white/20",
};

export function Badge({ children, color = "mint", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded border px-1.5 text-[10px] font-bold leading-[18px] ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
