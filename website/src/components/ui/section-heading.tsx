interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`mb-10 ${className}`}>
      <h2 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-vo-text-secondary text-base max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
