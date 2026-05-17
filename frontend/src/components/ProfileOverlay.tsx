import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getFriends, sendFriendRequest, removeFriend, startConversation, blockUser } from '../api/api';
import { useAuthStore } from '../store/authStore';
import Avatar from './Avatar';

interface Profile {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  friends: { userId: number; nickname: string; avatarUrl: string | null }[];
}

interface Friend {
  userId: number;
  friendshipId: number;
  nickname: string;
}

interface Props {
  userId: number;
  onClose: () => void;
  /** If provided, called instead of navigating to /chats when user clicks Message */
  onMessage?: (convId: number) => void;
  /** Hide the Message button (e.g. when already in a chat with this user) */
  hideMessageButton?: boolean;
}

export default function ProfileOverlay({ userId, onClose, onMessage, hideMessageButton }: Props) {
  const { userId: authUserId } = useAuthStore((s) => s);
  const navigate = useNavigate();
  const isOwn = userId === authUserId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendshipId, setFriendshipId] = useState<number | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    getProfile(userId).then(setProfile);
    if (!isOwn) {
      getFriends().then((list: Friend[]) => {
        const found = list.find((f) => f.userId === userId);
        if (found) { setIsFriend(true); setFriendshipId(found.friendshipId); }
      });
    }
  }, [userId]);

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
    if (!userId) return;
    try {
      const conv = await startConversation(userId);
      onClose();
      if (onMessage) {
        onMessage(conv.id);
      } else {
        navigate('/chats', { state: { conversationId: conv.id } });
      }
    } catch (err: any) {
      if (err?.response?.status === 403) setActionMsg('Privacy settings prevent messaging.');
      else if (err?.response?.status === 451) setActionMsg('Cannot message (blocked).');
      else setActionMsg('Cannot start conversation.');
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    if (!window.confirm(`Block ${profile.nickname}?`)) return;
    await blockUser(userId);
    setActionMsg(`${profile.nickname} blocked.`);
  };

  return (
    <div className="profile-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-overlay-panel">
        <div className="overlay-header">
          <button className="overlay-back" onClick={onClose}>←</button>
          <span>Profile</span>
        </div>

        {!profile ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
        ) : (
          <div className="overlay-body">
            <Avatar src={profile.avatarUrl} name={profile.nickname} size={88} />
            <h2 className="overlay-nickname">{profile.nickname}</h2>
            <p className="overlay-sub">{profile.friends.length} friends</p>

            {!isOwn && (
              <div className="overlay-actions">
                <button onClick={handleFriendToggle} className={isFriend ? 'danger' : ''}>
                  {isFriend ? 'Remove Friend' : 'Add Friend'}
                </button>
                {!hideMessageButton && (
                  <button onClick={handleMessage}>Message</button>
                )}
                <button className="danger" onClick={handleBlock}>Block</button>
              </div>
            )}

            {actionMsg && (
              <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', textAlign: 'center' }}>{actionMsg}</p>
            )}

            {profile.friends.length > 0 && (
              <div className="overlay-friends">
                <h3>Friends</h3>
                <div className="overlay-friends-list">
                  {profile.friends.map((f) => (
                    <div key={f.userId} className="overlay-friend-item">
                      <Avatar src={f.avatarUrl} name={f.nickname} size={36} />
                      <span>{f.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
