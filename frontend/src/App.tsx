import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { presencePing } from './api/api';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatsPage from './pages/ChatsPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  if (!hasHydrated) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Pings the presence endpoint every 30s while logged in. */
function usePresenceHeartbeat() {
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!token) return;
    presencePing();
    const id = setInterval(presencePing, 30_000);
    return () => clearInterval(id);
  }, [token]);
}

export default function App() {
  usePresenceHeartbeat();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chats" element={<PrivateLayout><ChatsPage /></PrivateLayout>} />
        <Route path="/friends" element={<PrivateLayout><FriendsPage /></PrivateLayout>} />
        <Route path="/profile" element={<PrivateLayout><ProfilePage /></PrivateLayout>} />
        {/* Public profile view for other users */}
        <Route path="/profile/:userId" element={<PrivateLayout><ProfilePage /></PrivateLayout>} />
        <Route path="/settings" element={<PrivateLayout><SettingsPage /></PrivateLayout>} />
        <Route path="*" element={<Navigate to="/chats" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
