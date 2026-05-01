import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import SandboxPage from './pages/SandboxPage';
import LobbyPage from './pages/LobbyPage';
import DraftPage from './pages/DraftPage';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sandbox" element={<SandboxPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/draft" element={<DraftPage />} />
      </Routes>
    </BrowserRouter>
  );
}
