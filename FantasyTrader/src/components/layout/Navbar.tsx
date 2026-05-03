import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { TitleBadge } from '../ui/TitleBadge';

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuthStore();
  const [photoFailed, setPhotoFailed] = useState(false);

  const initial = user?.displayName?.charAt(0).toUpperCase() ?? '?';

  function isActive(path: string) {
    return pathname === path;
  }

  async function handleSignOut() {
    await signOutUser();
    navigate('/login');
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-13 flex items-center justify-between px-5
      bg-[#0a0908]/90 backdrop-blur-md
      border-b border-white/[0.06]">

      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2.5 group"
      >
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

      {/* Nav links + user */}
      <div className="flex items-center gap-1">
        {user ? (
          <>
            {[
              { to: '/sandbox',     label: 'Sandbox',     activeColor: 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)]' },
              { to: '/lobby',       label: 'Lobby',       activeColor: 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)]' },
              { to: '/history',     label: 'History',     activeColor: 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)]' },
              { to: '/leaderboard', label: 'Leaderboard', activeColor: 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)]' },
            ].map(({ to, label, activeColor }) => (
              <Link
                key={to}
                to={to}
                className={`hidden sm:block text-[13px] px-3 py-1.5 rounded-md transition-colors font-medium ${
                  isActive(to)
                    ? activeColor
                    : 'text-[#7a6e60] hover:text-[#ede8df] hover:bg-white/[0.04]'
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="w-px h-4 bg-white/[0.08] mx-2" />

            {/* Coins */}
            <div className="flex items-center gap-1.5 bg-[rgba(200,168,130,0.07)] border border-[rgba(200,168,130,0.14)] rounded-full px-2.5 py-1">
              <span className="text-[#c8a882] text-xs">◈</span>
              <span className="text-[#c8a882] text-xs font-semibold font-mono tabular-nums">{user.coins}</span>
            </div>

            {/* User */}
            <Link
              to="/profile"
              className="flex items-center gap-2 ml-1 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors group"
            >
              {user.photoURL && !photoFailed ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[#c8a882]/20 border border-[#c8a882]/30 flex items-center justify-center text-[#c8a882] text-[10px] font-bold shrink-0">
                  {initial}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                <span className="text-[#ede8df] text-[12px] font-medium">{user.displayName}</span>
                {user.title && <TitleBadge titleId={user.title} size="sm" />}
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              className="hidden sm:block text-[#7a6e60] hover:text-[#ede8df] text-[13px] px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </>
        ) : !isActive('/login') ? (
          <Link
            to="/login"
            className="text-sm font-medium text-[#c8a882] px-3 py-1.5 rounded-lg bg-[rgba(200,168,130,0.08)] hover:bg-[rgba(200,168,130,0.12)] border border-[rgba(200,168,130,0.2)] transition-all"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
