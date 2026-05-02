// Fixed top navigation bar — auth-aware

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/** Fixed top navbar with logo, page links, and auth state. */
export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuthStore();

  function navLinkClass(path: string) {
    return `text-sm transition-colors px-3 py-1.5 rounded-lg ${
      pathname === path
        ? 'text-emerald-400 bg-emerald-500/10'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
    }`;
  }

  async function handleSignOut() {
    await signOutUser();
    navigate('/login');
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

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link to="/sandbox" className={navLinkClass('/sandbox')}>Sandbox</Link>
            <Link to="/lobby" className={navLinkClass('/lobby')}>Lobby</Link>
            <Link to="/history" className={navLinkClass('/history')}>History</Link>
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-700">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName} className="h-7 w-7 rounded-full" />
              )}
              <span className="text-zinc-300 text-sm hidden sm:block">{user.displayName}</span>
              <button
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-zinc-100 text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="text-sm text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
