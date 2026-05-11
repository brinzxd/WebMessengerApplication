import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfile, updateNickname, uploadAvatar, sendFriendRequest, startConversation, blockUser } from '../api/api';
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
  const { userId: authUserId } = useAuthStore((s) => s);
  const params = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const viewedUserId = params.userId ? Number(params.userId) : authUserId;
  const isOwnProfile = viewedUserId === authUserId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => getProfile(viewedUserId!).then(setProfile);

  useEffect(() => {
    load();
  }, [viewedUserId]);

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

  const handleAddFriend = async () => {
    if (!profile) return;
    try {
      await sendFriendRequest(profile.nickname);
      setActionMsg('Friend request sent!');
    } catch {
      setActionMsg('Request already sent or unavailable');
    }
  };

  const handleMessage = async () => {
    if (!viewedUserId) return;
    try {
      const conv = await startConversation(viewedUserId);
      navigate('/chats', { state: { conversationId: conv.id } });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data || '';
      if (typeof msg === 'string' && msg.length > 0) {
        setActionMsg(msg);
      } else if (err?.response?.status === 403) {
        setActionMsg('This user only accepts messages from friends.');
      } else if (err?.response?.status === 451) {
        setActionMsg('You cannot message this user (blocked).');
      } else {
        setActionMsg('Cannot start conversation with this user.');
      }
    }
  };

  const handleBlock = async () => {
    if (!viewedUserId || !profile) return;
    if (!window.confirm(`Block ${profile.nickname}?`)) return;
    await blockUser(viewedUserId);
    setActionMsg(`${profile.nickname} has been blocked.`);
  };

  if (!profile) return <div className="loading">Loading...</div>;

  return (
    <div className="app-layout">
      <Sidebar active="profile" />
      <div className="main-content">
        <div className="profile-header">
          <div
            className="avatar-wrapper"
            onClick={() => isOwnProfile && fileRef.current?.click()}
            style={{ cursor: isOwnProfile ? 'pointer' : 'default' }}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="avatar-lg" />
            ) : (
              <div className="avatar-placeholder-lg">{profile.nickname[0]}</div>
            )}
            {isOwnProfile && <div className="avatar-overlay">Change</div>}
          </div>
          {isOwnProfile && (
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatar}
            />
          )}
          <div className="profile-info">
            {isOwnProfile && editing ? (
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
                {isOwnProfile ? (
                  <button onClick={() => { setNewNickname(profile.nickname); setEditing(true); }}>
                    Edit
                  </button>
                ) : (
                  <div className="profile-actions">
                    <button onClick={handleAddFriend}>Add Friend</button>
                    <button onClick={handleMessage}>Message</button>
                    <button className="danger" onClick={handleBlock}>Block</button>
                    {actionMsg && <p className="action-msg">{actionMsg}</p>}
                  </div>
                )}
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
