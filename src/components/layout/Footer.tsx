export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[11px] text-text-dim">
          <span>Powered by</span>
          <a
            href="https://yo.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent transition-colors"
          >
            YO Protocol
          </a>
          <span className="text-white/[0.08]">|</span>
          <span>Non-custodial</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-text-dim">
          <a href="https://docs.yo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">
            Docs
          </a>
          <a href="https://github.com/yo-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
