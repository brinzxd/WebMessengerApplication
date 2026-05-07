import { useEffect, useState, useRef } from 'react';
import { getProfile, updateNickname, uploadAvatar } from '../api/api';
import { useAuthStore } from '../store/authStore';
import Sidebar from '../components/Sidebar';

interface Profile {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  friends: {
    userId: number;
    nickname: string;
    avatarUrl: string | null;
  }[];
}

export default function ProfilePage() {
  const { userId } = useAuthStore((s) => s);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => getProfile(userId!).then(setProfile);

  useEffect(() => {
    load();
  }, []);

  const handleNickname = async () => {
    if (!newNickname.trim()) return;
    try {
      await updateNickname(newNickname.trim());
      setEditing(false);
      load();
    } catch {
      setError('Nickname already taken');
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    load();
  };

  if (!profile) return <div className="loading">Loading...</div>;

  return (
    <div className="app-layout">
      <Sidebar active="profile" />
      <div className="main-content">
        <div className="profile-header">
          <div className="avatar-wrapper" onClick={() => fileRef.current?.click()}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="avatar-lg" />
            ) : (
              <div className="avatar-placeholder-lg">{profile.nickname[0]}</div>
            )}
            <div className="avatar-overlay">Change</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatar}
          />
          <div className="profile-info">
            {editing ? (
              <div className="nickname-edit">
                <input
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="New nickname"
                />
                <button onClick={handleNickname}>Save</button>
                <button onClick={() => setEditing(false)}>Cancel</button>
                {error && <p className="error">{error}</p>}
              </div>
            ) : (
              <div className="nickname-display">
                <h2>{profile.nickname}</h2>
                <button onClick={() => { setNewNickname(profile.nickname); setEditing(true); }}>
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="friends-section">
          <h3>Friends ({profile.friends.length})</h3>
          <div className="friends-list">
            {profile.friends.map((f) => (
              <div key={f.userId} className="friend-item">
                {f.avatarUrl ? (
                  <img src={f.avatarUrl} alt={f.nickname} className="avatar-sm" />
                ) : (
                  <div className="avatar-placeholder-sm">{f.nickname[0]}</div>
                )}
                <span>{f.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
