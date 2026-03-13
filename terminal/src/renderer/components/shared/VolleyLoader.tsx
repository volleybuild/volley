import React from "react";

type LoaderSize = "xs" | "sm" | "md" | "lg";
type LoaderVariant = "colored" | "mono";

interface VolleyLoaderProps {
  size?: LoaderSize;
  variant?: LoaderVariant;
  className?: string;
}

const SIZES: Record<LoaderSize, number> = {
  xs: 12,
  sm: 20,
  md: 32,
  lg: 48,
};

/* V-arrangement matching volley-logo.svg (viewBox 0 0 76 64) */
const DOTS = [
  { cx: 15, cy: 15, r: 15, anim: "animate-vl-dot0" },
  { cx: 61, cy: 15, r: 15, anim: "animate-vl-dot1" },
  { cx: 38, cy: 49, r: 15, anim: "animate-vl-dot2" },
] as const;

const BRAND_FILLS = ["#34d399", "#fbbf24", "#a78bfa"];

export default function VolleyLoader({
  size = "md",
  variant = "colored",
  className = "",
}: VolleyLoaderProps) {
  const px = SIZES[size];

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox="0 0 76 64"
        width={px}
        height={px}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {DOTS.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={variant === "colored" ? BRAND_FILLS[i] : "currentColor"}
            className={dot.anim}
            style={{ transformOrigin: `${dot.cx}px ${dot.cy}px` }}
          />
        ))}
      </svg>
    </div>
  );
}
