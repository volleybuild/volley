export function Footer() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-vo-text-muted text-sm">
          <svg width="14" height="12" viewBox="0 0 48 40" fill="none" className="text-vo-text-muted">
            <path d="M8 4L24 20L8 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
            <path d="M18 4L34 20L18 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d="M28 4L44 20L28 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>&copy; {new Date().getFullYear()} Volley</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-vo-text-muted">
          <a
            href="https://github.com/volleybuild/volley"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-vo-text transition-colors"
          >
            GitHub
          </a>
          <a href="#" className="hover:text-vo-text transition-colors">
            Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
