import { Link } from 'react-router-dom';

interface SidebarProps {
  active: 'chats' | 'friends' | 'profile' | 'settings';
}

export default function Sidebar({ active }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">WM</div>
      <ul className="sidebar-nav">
        <li className={active === 'chats' ? 'active' : ''}>
          <Link to="/chats" title="Chats">💬</Link>
        </li>
        <li className={active === 'friends' ? 'active' : ''}>
          <Link to="/friends" title="Friends">👥</Link>
        </li>
        <li className={active === 'profile' ? 'active' : ''}>
          <Link to="/profile" title="Profile">👤</Link>
        </li>
        <li className={active === 'settings' ? 'active' : ''}>
          <Link to="/settings" title="Settings">⚙️</Link>
        </li>
      </ul>
    </nav>
  );
}
