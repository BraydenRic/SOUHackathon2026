// Fixed top navigation bar — desktop links + coin balance + profile, mobile hamburger drawer

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { TitleBadge } from '../ui/TitleBadge';

/**
 * Global navigation bar. On desktop, shows nav links, coin balance, and profile.
 * On mobile, collapses to a hamburger button that opens a full-screen drawer.
 */
export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuthStore();
  const [photoFailed, setPhotoFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = user?.displayName?.charAt(0).toUpperCase() ?? '?';

  /** Returns true when the current route matches `path` — used to apply the active link style */
  function isActive(path: string) {
    return pathname === path;
  }

  /** Signs out, redirects to /login, and closes the mobile drawer */
  async function handleSignOut() {
    await signOutUser();
    navigate('/login');
    setMenuOpen(false);
  }

  /** Ordered list of navigation links shown in both the desktop nav and mobile drawer */
  const navLinks = [
    { to: '/sandbox',     label: 'Sandbox' },
    { to: '/lobby',       label: 'Lobby' },
    { to: '/history',     label: 'History' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 h-13 flex items-center justify-between px-5
        bg-[#0a0908]/90 backdrop-blur-md
        border-b border-white/[0.06]">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-7 w-7 rounded-md bg-[#c8a882]/10 border border-[#c8a882]/20 flex items-center justify-center
            group-hover:bg-[#c8a882]/15 transition-colors">
            <svg className="h-3.5 w-3.5 text-[#c8a882]" fill="none" viewBox="0 0 20 14" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 11 6 5.5 10 8.5 15 3" />
              <polyline points="12 3 15 3 15 6" />
            </svg>
          </div>
          <span className="font-heading font-bold text-[15px] tracking-tight text-[#ede8df]">
            Fantasy<span className="text-[#c8a882]">Trader</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {user ? (
            <>
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-[13px] px-3 py-1.5 rounded-md transition-colors font-medium ${
                    isActive(to)
                      ? 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)]'
                      : 'text-[#7a6e60] hover:text-[#ede8df] hover:bg-white/[0.04]'
                  }`}
                >
                  {label}
                </Link>
              ))}

              <div className="w-px h-4 bg-white/[0.08] mx-2" />

              <div className="flex items-center gap-1.5 bg-[rgba(200,168,130,0.07)] border border-[rgba(200,168,130,0.14)] rounded-full px-2.5 py-1">
                <span className="text-[#c8a882] text-xs">◈</span>
                <span className="text-[#c8a882] text-xs font-semibold font-mono tabular-nums">{user.coins}</span>
              </div>

              <Link
                to="/profile"
                className="flex items-center gap-2 ml-1 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                {user.photoURL && !photoFailed ? (
                  <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer"
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
                    onError={() => setPhotoFailed(true)} />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-[#c8a882]/20 border border-[#c8a882]/30 flex items-center justify-center text-[#c8a882] text-[10px] font-bold shrink-0">
                    {initial}
                  </div>
                )}
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span className="text-[#ede8df] text-[12px] font-medium">{user.displayName}</span>
                  {user.title && <TitleBadge titleId={user.title} size="sm" />}
                </div>
              </Link>

              <button
                onClick={handleSignOut}
                className="text-[#7a6e60] hover:text-[#ede8df] text-[13px] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : !isActive('/login') ? (
            <Link to="/login" className="text-sm font-medium text-[#c8a882] px-3 py-1.5 rounded-lg bg-[rgba(200,168,130,0.08)] hover:bg-[rgba(200,168,130,0.12)] border border-[rgba(200,168,130,0.2)] transition-all">
              Sign in
            </Link>
          ) : null}
        </div>

        {/* Mobile right side */}
        <div className="flex sm:hidden items-center gap-2">
          {user && (
            <div className="flex items-center gap-1.5 bg-[rgba(200,168,130,0.07)] border border-[rgba(200,168,130,0.14)] rounded-full px-2.5 py-1">
              <span className="text-[#c8a882] text-xs">◈</span>
              <span className="text-[#c8a882] text-xs font-semibold font-mono tabular-nums">{user.coins}</span>
            </div>
          )}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-2 rounded-md text-[#7a6e60] hover:text-[#ede8df] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-13 inset-x-0 bg-[#0a0908]/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 space-y-1"
            onClick={e => e.stopPropagation()}>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                  {user.photoURL && !photoFailed ? (
                    <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#c8a882]/20 border border-[#c8a882]/30 flex items-center justify-center text-[#c8a882] text-xs font-bold">
                      {initial}
                    </div>
                  )}
                  <div>
                    <p className="text-[#ede8df] text-sm font-medium">{user.displayName}</p>
                    {user.title && <TitleBadge titleId={user.title} size="sm" />}
                  </div>
                </Link>

                <div className="h-px bg-white/[0.05] my-1" />

                {navLinks.map(({ to, label }) => (
                  <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive(to)
                        ? 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)]'
                        : 'text-[#7a6e60] hover:text-[#ede8df] hover:bg-white/[0.04]'
                    }`}>
                    {label}
                  </Link>
                ))}

                <div className="h-px bg-white/[0.05] my-1" />

                <button onClick={handleSignOut}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-[#ff4560] hover:bg-[rgba(255,69,96,0.06)] transition-colors cursor-pointer">
                  Sign Out
                </button>
              </>
            ) : !isActive('/login') ? (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#c8a882]">
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
