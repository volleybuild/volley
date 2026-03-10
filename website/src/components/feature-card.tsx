interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="group p-5 rounded-lg border border-transparent hover:border-vo-border-subtle transition-colors duration-200">
      <div className="w-8 h-8 rounded-md bg-white/[0.04] flex items-center justify-center mb-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-bright/70"
        >
          <path d={icon} />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-vo-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
