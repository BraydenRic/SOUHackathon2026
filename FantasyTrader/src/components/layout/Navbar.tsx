// Fixed top navigation bar

import { Link, useLocation } from 'react-router-dom';

/** Fixed top navbar with app logo and page links. */
export function Navbar() {
  const { pathname } = useLocation();

  function navLinkClass(path: string) {
    return `text-sm transition-colors px-3 py-1.5 rounded-lg ${
      pathname === path
        ? 'text-emerald-400 bg-emerald-500/10'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
    }`;
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2 text-emerald-400 font-bold text-lg tracking-tight">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        StockDraft
      </Link>

      <div className="flex items-center gap-1">
        <Link to="/sandbox" className={navLinkClass('/sandbox')}>Sandbox</Link>
        <Link to="/lobby" className={navLinkClass('/lobby')}>Lobby</Link>
      </div>
    </nav>
  );
}
