import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SandboxPage from './pages/SandboxPage';
import LobbyPage from './pages/LobbyPage';
import DraftPage from './pages/DraftPage';
import GamePage from './pages/GamePage';
import HistoryPage from './pages/HistoryPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    const unsub = initialize();
    return unsub;
  }, [initialize]);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sandbox" element={<ProtectedRoute><SandboxPage /></ProtectedRoute>} />
        <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/draft/:roomId" element={<ProtectedRoute><DraftPage /></ProtectedRoute>} />
        <Route path="/game/:roomId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
