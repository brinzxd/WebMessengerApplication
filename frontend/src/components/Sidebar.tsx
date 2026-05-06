import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  active: 'chats' | 'friends' | 'profile' | 'settings';
}

export default function Sidebar({ active }: SidebarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">WM</div>
      <ul className="sidebar-nav">
        <li className={active === 'chats' ? 'active' : ''}>
          <Link to="/chats" title="Chats">
            <span className="sidebar-icon">&#128172;</span>
          </Link>
        </li>
        <li className={active === 'friends' ? 'active' : ''}>
          <Link to="/friends" title="Friends">
            <span className="sidebar-icon">&#128101;</span>
          </Link>
        </li>
        <li className={active === 'profile' ? 'active' : ''}>
          <Link to="/profile" title="Profile">
            <span className="sidebar-icon">&#128100;</span>
          </Link>
        </li>
        <li className={active === 'settings' ? 'active' : ''}>
          <Link to="/settings" title="Settings">
            <span className="sidebar-icon">&#9881;</span>
          </Link>
        </li>
      </ul>
      <button className="sidebar-logout" onClick={handleLogout} title="Logout">
        <span className="sidebar-icon">&#128682;</span>
      </button>
    </nav>
  );
}
