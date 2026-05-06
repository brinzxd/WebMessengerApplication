import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFriends,
  getFriendRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  startConversation,
} from '../api/api';
import Sidebar from '../components/Sidebar';

interface Friend {
  friendshipId: number;
  userId: number;
  nickname: string;
  avatar: string | null;
  online: boolean;
  lastSeen: string | null;
}

interface FriendRequest {
  id: number;
  fromUserId: number;
  fromNickname: string;
  fromAvatar: string | null;
  createdAt: string;
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState('');

  const load = () => {
    getFriends().then(setFriends);
    getFriendRequests().then(setIncoming);
    getSentRequests().then(setSent);
  };

  useEffect(() => { load(); }, []);

  const handleSendRequest = async () => {
    if (!search.trim()) return;
    try {
      await sendFriendRequest(search.trim());
      setSearch('');
      setSearchError('');
      load();
    } catch {
      setSearchError('User not found or request already sent');
    }
  };

  const handleMessage = async (userId: number) => {
    const conv = await startConversation(userId);
    navigate('/chats', { state: { conversationId: conv.id } });
  };

  return (
    <div className="app-layout">
      <Sidebar active="friends" />
      <div className="main-content">
        <div className="page-header">
          <h2>Friends</h2>
          <div className="add-friend">
            <input
              placeholder="Add by nickname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
            <button onClick={handleSendRequest}>Add</button>
            {searchError && <span className="error">{searchError}</span>}
          </div>
        </div>
        <div className="tabs">
          <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>Friends ({friends.length})</button>
          <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Requests ({incoming.length})</button>
        </div>
        {tab === 'friends' && (
          <div className="friend-list">
            {friends.map((f) => (
              <div key={f.friendshipId} className="friend-item">
                <div className="friend-avatar">
                  {f.avatar ? <img src={f.avatar} alt="" /> : <span>{f.nickname[0]}</span>}
                  <span className={`status-dot ${f.online ? 'online' : 'offline'}`} />
                </div>
                <div className="friend-info">
                  <strong>{f.nickname}</strong>
                  {!f.online && f.lastSeen && <small>Last seen {f.lastSeen}</small>}
                </div>
                <div className="friend-actions">
                  <button onClick={() => handleMessage(f.userId)}>Message</button>
                  <button className="danger" onClick={async () => { await removeFriend(f.friendshipId); load(); }}>Remove</button>
                </div>
              </div>
            ))}
            {friends.length === 0 && <p className="empty">No friends yet. Add someone!</p>}
          </div>
        )}
        {tab === 'requests' && (
          <div className="requests-list">
            <h3>Incoming</h3>
            {incoming.map((r) => (
              <div key={r.id} className="request-item">
                <span>{r.fromNickname}</span>
                <button onClick={async () => { await acceptFriendRequest(r.id); load(); }}>Accept</button>
                <button className="danger" onClick={async () => { await declineFriendRequest(r.id); load(); }}>Decline</button>
              </div>
            ))}
            {incoming.length === 0 && <p className="empty">No incoming requests</p>}
            <h3>Sent</h3>
            {sent.map((r) => (
              <div key={r.id} className="request-item">
                <span>{r.fromNickname}</span>
                <span className="tag">Pending</span>
              </div>
            ))}
            {sent.length === 0 && <p className="empty">No sent requests</p>}
          </div>
        )}
      </div>
    </div>
  );
}
