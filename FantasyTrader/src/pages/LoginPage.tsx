/**
 * LoginPage.tsx
 *
 * This is the login page — it's the first thing unauthenticated users see
 * when they try to access the app. We only support Google sign-in right now,
 * so there's no email/password form or anything like that. Just one button.
 *
 * Once the user successfully signs in with Google, they get automatically
 * redirected to the sandbox page. We use { replace: true } on the navigation
 * so the login page doesn't stay in the browser history — if they hit the
 * back button after logging in, they won't get sent back to the login screen.
 *
 * If the user is already logged in when they land on this page (e.g. they
 * manually navigated to /login while already authenticated), the useEffect
 * catches that and redirects them to the sandbox immediately.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

/**
 * LoginPage component
 *
 * A simple centered card with the app name, tagline, and a Google sign-in button.
 * Handles three states:
 * 1. Loading — while Firebase is checking if the user is already logged in
 * 2. Authenticated — redirects away immediately, user never sees the form
 * 3. Unauthenticated — shows the sign-in card
 *
 * Error handling is also built in — if the Google sign-in popup fails for
 * any reason (user closes it, network issue, etc.), the error from the auth
 * store gets displayed below the button.
 */
export default function LoginPage() {
  const navigate = useNavigate();

  /**
   * Pull auth state and actions from the store.
   * - user: the logged-in user object, or null if not logged in
   * - loading: true while Firebase is initializing and checking auth state
   * - error: any error message from a failed sign-in attempt
   * - signInWithGoogle: triggers the Google OAuth popup flow
   */
  const { user, loading, error, signInWithGoogle } = useAuthStore();

  /**
   * Redirect to sandbox if the user is already logged in.
   *
   * This fires when the component mounts and whenever user or loading changes.
   * We wait for loading to be false first so we don't redirect before Firebase
   * has finished checking whether there's an existing session.
   *
   * { replace: true } replaces the current history entry instead of pushing
   * a new one — this means the back button won't bring them back to /login.
   */
  useEffect(() => {
    if (!loading && user) navigate('/sandbox', { replace: true });
  }, [user, loading, navigate]);

  /**
   * Show a full-screen spinner while Firebase is initializing.
   * This prevents the login form from flashing briefly for users who are
   * already logged in before getting redirected to the sandbox.
   */
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* App name and tagline above the card */}
        <div className="text-center mb-8">
          <h1 className="text-zinc-100 text-3xl font-bold mb-2">Fantasy Trader</h1>
          <p className="text-zinc-400">Trade smart. Draft smarter.</p>
        </div>

        {/* Sign-in card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
          <h2 className="text-zinc-100 font-semibold text-center">Sign in to play</h2>

          {/*
            Google sign-in button.
            Calls signInWithGoogle() from the auth store which opens
            the Google OAuth popup. The SVG inside is the official
            Google "G" logo broken into four colored path segments.
            We're using currentColor so it inherits the button's text color.
          */}
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={signInWithGoogle}
          >
            {/* Google logo SVG — four paths make up the G shape */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          {/*
            Error message — only renders if something went wrong during sign-in.
            Common causes: user closed the popup, pop-ups are blocked, or
            there was a network issue during the OAuth flow.
          */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}