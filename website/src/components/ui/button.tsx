"use client";

import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

type ButtonBaseProps = {
  variant?: Variant;
  className?: string;
};

type AsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AsAnchor = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = AsButton | AsAnchor;

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer select-none disabled:opacity-40 disabled:cursor-default";

const variants: Record<Variant, string> = {
  primary:
    "text-[#0a0a0c] bg-gradient-to-b from-[#6ee7b7] to-[#34d399] hover:from-[#7eedc4] hover:to-[#3ddda3] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-5px_rgba(110,231,183,0.4)]",
  ghost:
    "text-vo-text-secondary border border-vo-border hover:text-vo-text hover:border-vo-text-muted hover:bg-white/[0.04]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${className}`;

  if ("href" in props && props.href) {
    return <a className={cls} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  }

  return <button className={cls} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
