export function Footer() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-vo-text-muted text-sm">
          <svg width="14" height="11" viewBox="0 0 76 64" fill="none">
            <circle cx="15" cy="15" r="15" fill="#6b7280" />
            <circle cx="61" cy="15" r="15" fill="#6b7280" />
            <circle cx="38" cy="49" r="15" fill="#6b7280" />
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
