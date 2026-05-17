import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProfile, updateNickname, uploadAvatar, sendFriendRequest,
  removeFriend, startConversation, blockUser, getFriends,
} from '../api/api';
import { useAuthStore } from '../store/authStore';
import Sidebar from '../components/Sidebar';
import Avatar from '../components/Avatar';

interface Profile {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  friends: { userId: number; nickname: string; avatarUrl: string | null }[];
}

interface FriendEntry {
  userId: number;
  friendshipId: number;
  nickname: string;
}

export default function ProfilePage() {
  const { userId: authUserId } = useAuthStore((s) => s);
  const params = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const viewedUserId = params.userId ? Number(params.userId) : authUserId;
  const isOwnProfile = viewedUserId === authUserId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipId, setFriendshipId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const load = () => {
    getProfile(viewedUserId!).then(setProfile).catch(() => setProfileError(true));
    if (!isOwnProfile) {
      getFriends().then((list: FriendEntry[]) => {
        const found = list.find((f) => f.userId === viewedUserId);
        setIsFriend(!!found);
        setFriendshipId(found ? found.friendshipId : null);
      });
    }
  };

  useEffect(() => { load(); }, [viewedUserId]);

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
    e.target.value = '';
    try {
      await uploadAvatar(file);
      load();
    } catch (err: any) {
      if (err?.response?.status === 413) {
        setActionMsg('Image is too large. Please choose a smaller photo.');
      } else {
        setActionMsg('Failed to upload avatar.');
      }
    }
  };

  const handleFriendToggle = async () => {
    if (!profile) return;
    if (isFriend && friendshipId !== null) {
      if (!window.confirm('Remove from friends?')) return;
      await removeFriend(friendshipId);
      setIsFriend(false);
      setFriendshipId(null);
      setActionMsg('Removed from friends');
    } else {
      try {
        await sendFriendRequest(profile.nickname);
        setActionMsg('Friend request sent!');
      } catch {
        setActionMsg('Request already sent or unavailable');
      }
    }
  };

  const handleMessage = async () => {
    if (!viewedUserId) return;
    try {
      const conv = await startConversation(viewedUserId);
      navigate('/chats', { state: { conversationId: conv.id } });
    } catch (err: any) {
      if (err?.response?.status === 403) setActionMsg('This user only accepts messages from friends.');
      else if (err?.response?.status === 451) setActionMsg('Cannot message (blocked).');
      else setActionMsg('Cannot start conversation.');
    }
  };

  const handleBlock = async () => {
    if (!viewedUserId || !profile) return;
    if (!window.confirm(`Block ${profile.nickname}?`)) return;
    await blockUser(viewedUserId);
    setActionMsg(`${profile.nickname} has been blocked.`);
  };

  if (profileError) return <div className="loading">Profile not found.</div>;
  if (!profile) return <div className="loading">Loading…</div>;

  return (
    <div className="app-layout">
      <Sidebar active="profile" />
      <div className="main-content">

        <div className="profile-header">
          {isOwnProfile ? (
            <>
              <label htmlFor="avatar-file-input" className="avatar-wrapper" style={{ cursor: 'pointer' }}>
                <Avatar key={profile.avatarUrl ?? 'empty'} src={profile.avatarUrl} name={profile.nickname} size={100} />
                <div className="avatar-overlay">Change</div>
              </label>
              {/* Input outside overflow:hidden — required for iOS Safari file picker */}
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                style={{ position: 'fixed', top: '-100vh', left: '-100vw', opacity: 0, width: 0, height: 0 }}
                onChange={handleAvatar}
              />
            </>
          ) : (
            <div className="avatar-wrapper" style={{ cursor: 'default' }}>
              <Avatar key={profile.avatarUrl ?? 'empty'} src={profile.avatarUrl} name={profile.nickname} size={100} />
            </div>
          )}

          <div className="profile-info">
            {isOwnProfile && editing ? (
              <div className="nickname-edit">
                <input
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="New nickname"
                  onKeyDown={(e) => e.key === 'Enter' && handleNickname()}
                />
                <button onClick={handleNickname}>Save</button>
                <button onClick={() => setEditing(false)}>Cancel</button>
                {error && <p className="error">{error}</p>}
              </div>
            ) : (
              <div className="nickname-display">
                <h2>{profile.nickname}</h2>
                {isOwnProfile ? (
                  <button onClick={() => { setNewNickname(profile.nickname); setEditing(true); }}>Edit</button>
                ) : (
                  <div className="profile-actions">
                    <button onClick={handleFriendToggle} className={isFriend ? 'danger' : ''}>
                      {isFriend ? 'Remove Friend' : 'Add Friend'}
                    </button>
                    <button onClick={handleMessage}>Message</button>
                    <button className="danger" onClick={handleBlock}>Block</button>
                  </div>
                )}
              </div>
            )}
            {actionMsg && <p className="action-msg">{actionMsg}</p>}
          </div>
        </div>

        <div className="friends-section">
          <h3>Friends ({profile.friends.length})</h3>
          <div className="friends-list">
            {profile.friends.map((f) => (
              <div key={f.userId} className="friend-item" onClick={() => navigate(`/profile/${f.userId}`)}>
                <Avatar src={f.avatarUrl} name={f.nickname} size={40} />
                <span style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>{f.nickname}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
