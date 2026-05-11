import { useEffect, useState } from 'react';
import { getSettings, updateSettings, getBlockedUsers, unblockUser } from '../api/api';
import Sidebar from '../components/Sidebar';

interface Settings {
  whoCanMessage: 'EVERYONE' | 'FRIENDS_ONLY' | 'NO_ONE';
  onlineVisibility: 'EVERYONE' | 'FRIENDS_ONLY' | 'NO_ONE';
}

interface BlockedUser {
  id: number;
  nickname: string;
  avatarUrl: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    whoCanMessage: 'EVERYONE',
    onlineVisibility: 'EVERYONE',
  });
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    getSettings().then((s: Settings) => {
      setSettings(s);
      setLoaded(true);
    });
    getBlockedUsers().then(setBlocked);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUnblock = async (userId: number) => {
    await unblockUser(userId);
    load();
  };

  // Don't render selects until real values are loaded to avoid flicker
  if (!loaded) return <div className="loading">Loading...</div>;

  return (
    <div className="app-layout">
      <Sidebar active="settings" />
      <div className="main-content">
        <h2>Settings</h2>
        <div className="settings-section">
          <h3>Privacy</h3>
          <label>
            Who can message me:
            <select
              value={settings.whoCanMessage}
              onChange={(e) => setSettings({ ...settings, whoCanMessage: e.target.value as Settings['whoCanMessage'] })}
            >
              <option value="EVERYONE">Everyone</option>
              <option value="FRIENDS_ONLY">Friends only</option>
              <option value="NO_ONE">No one</option>
            </select>
          </label>
          <label>
            Who can see my online status:
            <select
              value={settings.onlineVisibility}
              onChange={(e) => setSettings({ ...settings, onlineVisibility: e.target.value as Settings['onlineVisibility'] })}
            >
              <option value="EVERYONE">Everyone</option>
              <option value="FRIENDS_ONLY">Friends only</option>
              <option value="NO_ONE">No one</option>
            </select>
          </label>
          <button onClick={handleSave}>Save</button>
          {saved && <span className="saved-msg">Saved!</span>}
        </div>

        <div className="settings-section">
          <h3>Blocked Users</h3>
          {blocked.length === 0 ? (
            <p>No blocked users</p>
          ) : (
            blocked.map((u) => (
              <div key={u.id} className="blocked-user">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.nickname} className="avatar-sm" />
                ) : (
                  <div className="avatar-placeholder-sm">{u.nickname[0]}</div>
                )}
                <span>{u.nickname}</span>
                <button onClick={() => handleUnblock(u.id)}>Unblock</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
