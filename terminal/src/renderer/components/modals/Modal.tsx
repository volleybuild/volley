import React, { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  variant?: "default" | "danger" | "success";
}

/**
 * Premium Modal — Terminal-luxe aesthetic
 *
 * Features:
 * - Cinematic scale + fade entrance with spring physics
 * - Ambient glow effect matching variant
 * - Subtle scanline texture overlay
 * - Floating depth with layered shadows
 * - Corner accents inspired by tech HUDs
 */
export default function Modal({
  open,
  onClose,
  children,
  width = "w-96",
  variant = "default"
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Animate in
      requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = "1";
        }
        if (contentRef.current) {
          contentRef.current.style.opacity = "1";
          contentRef.current.style.transform = "scale(1) translateY(0)";
        }
      });
    }
  }, [open]);

  const handleClose = () => {
    // Animate out
    if (overlayRef.current) {
      overlayRef.current.style.opacity = "0";
    }
    if (contentRef.current) {
      contentRef.current.style.opacity = "0";
      contentRef.current.style.transform = "scale(0.95) translateY(8px)";
    }
    setTimeout(onClose, 150);
  };

  if (!open) return null;

  const glowColors = {
    default: "rgba(110, 231, 183, 0.08)",
    danger: "rgba(248, 113, 113, 0.08)",
    success: "rgba(110, 231, 183, 0.12)",
  };

  const accentColors = {
    default: "#6ee7b7",
    danger: "#f87171",
    success: "#34d399",
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        opacity: 0,
        transition: "opacity 150ms ease-out",
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)",
        backdropFilter: "blur(8px) saturate(120%)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose();
        }
      }}
    >
      <div
        ref={contentRef}
        className={`relative ${width}`}
        style={{
          opacity: 0,
          transform: "scale(0.95) translateY(8px)",
          transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Ambient glow layer */}
        <div
          className="absolute -inset-px rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${glowColors[variant]}, transparent)`,
          }}
        />

        {/* Main modal container */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0f0f12 0%, #0a0a0c 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.06),
              0 0 0 1px inset rgba(255,255,255,0.02),
              0 25px 50px -12px rgba(0,0,0,0.8),
              0 12px 24px -8px rgba(0,0,0,0.5),
              0 0 60px -10px ${glowColors[variant]}
            `,
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-16"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColors[variant]}40, transparent)`,
            }}
          />

          {/* Corner accents */}
          <svg className="absolute top-0 left-0 w-4 h-4 text-white/[0.08]" viewBox="0 0 16 16">
            <path d="M0 8 L0 1 Q0 0 1 0 L8 0" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <svg className="absolute top-0 right-0 w-4 h-4 text-white/[0.08]" viewBox="0 0 16 16">
            <path d="M8 0 L15 0 Q16 0 16 1 L16 8" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <svg className="absolute bottom-0 left-0 w-4 h-4 text-white/[0.08]" viewBox="0 0 16 16">
            <path d="M0 8 L0 15 Q0 16 1 16 L8 16" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <svg className="absolute bottom-0 right-0 w-4 h-4 text-white/[0.08]" viewBox="0 0 16 16">
            <path d="M8 16 L15 16 Q16 16 16 15 L16 8" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>

          {/* Scanline texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.015]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.5) 2px,
                rgba(255,255,255,0.5) 3px
              )`,
            }}
          />

          {/* Content */}
          <div className="relative p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components for consistent modal anatomy ─────────────────

interface ModalTitleProps {
  children: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function ModalTitle({ children, subtitle, icon }: ModalTitleProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06]">
            {icon}
          </div>
        )}
        <h2 className="text-sm font-medium text-white/90 tracking-tight">
          {children}
        </h2>
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface ModalActionsProps {
  children: React.ReactNode;
  hint?: string;
}

export function ModalActions({ children, hint }: ModalActionsProps) {
  return (
    <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.04]">
      {hint ? (
        <span className="text-[10px] text-gray-600 font-mono">{hint}</span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}

interface ModalButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "ghost" | "primary" | "danger";
  disabled?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export const ModalButton = React.forwardRef<HTMLButtonElement, ModalButtonProps>(
  function ModalButton({ children, onClick, variant = "ghost", disabled }, ref) {
    const baseStyles = "relative text-xs font-medium px-4 py-2 rounded-lg transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40 disabled:cursor-not-allowed";

    const variants = {
      ghost: "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]",
      primary: `
        text-[#0a0a0c] bg-gradient-to-b from-[#6ee7b7] to-[#34d399]
        hover:from-[#7eedc4] hover:to-[#3ddda3]
        shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-5px_rgba(110,231,183,0.4)]
        hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_30px_-5px_rgba(110,231,183,0.5)]
      `,
      danger: `
        text-white bg-gradient-to-b from-[#ef4444] to-[#dc2626]
        hover:from-[#f55] hover:to-[#e53]
        shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-5px_rgba(248,113,113,0.3)]
        hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_30px_-5px_rgba(248,113,113,0.4)]
      `,
    };

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        className={`${baseStyles} ${variants[variant]}`}
      >
        {children}
      </button>
    );
  }
);

interface ModalInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function ModalInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  onKeyDown,
  inputRef
}: ModalInputProps) {
  return (
    <div className="relative group">
      {/* Glow effect on focus */}
      <div className="absolute -inset-px rounded-lg bg-accent/0 group-focus-within:bg-accent/5 transition-colors pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        className="
          relative w-full px-3 py-2.5
          bg-[#0a0a0c]
          border border-white/[0.08]
          rounded-lg
          text-sm text-white/90
          placeholder:text-gray-600
          outline-none
          focus:border-accent/40
          transition-colors
          font-mono
        "
        style={{
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
        }}
      />

      {/* Subtle cursor blink indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-accent/0 group-focus-within:bg-accent/60 group-focus-within:animate-pulse rounded-full" />
    </div>
  );
}

interface ModalTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export function ModalTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  onKeyDown,
  textareaRef
}: ModalTextareaProps) {
  return (
    <div className="relative group">
      <div className="absolute -inset-px rounded-lg bg-accent/0 group-focus-within:bg-accent/5 transition-colors pointer-events-none" />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoComplete="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        className="
          relative w-full px-3 py-2.5
          bg-[#0a0a0c]
          border border-white/[0.08]
          rounded-lg
          text-sm text-white/90
          placeholder:text-gray-600
          outline-none
          focus:border-accent/40
          transition-colors
          font-mono
          resize-none
        "
        style={{
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}
