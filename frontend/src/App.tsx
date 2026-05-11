import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatsPage from './pages/ChatsPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
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
