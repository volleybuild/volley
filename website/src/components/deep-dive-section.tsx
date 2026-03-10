"use client";

import { useEffect, useRef, useState } from "react";

interface DeepDiveSectionProps {
  title: string;
  description: string;
  animation: React.ReactNode;
  reversed?: boolean;
}

export function DeepDiveSection({
  title,
  description,
  animation,
  reversed = false,
}: DeepDiveSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="py-16 px-6">
      <div
        className={`max-w-6xl mx-auto flex flex-col gap-10 items-center ${
          reversed ? "lg:flex-row-reverse" : "lg:flex-row"
        }`}
      >
        {/* Text side */}
        <div
          className={`flex-1 transition-all duration-700 ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h3 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight mb-3">
            {title}
          </h3>
          <p className="text-vo-text-secondary leading-relaxed max-w-md">
            {description}
          </p>
        </div>

        {/* Animation side */}
        <div
          className={`flex-1 w-full transition-all duration-700 delay-200 ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          {visible && animation}
        </div>
      </div>
    </div>
  );
}
