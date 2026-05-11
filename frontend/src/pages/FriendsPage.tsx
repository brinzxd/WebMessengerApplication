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
  searchUsers,
  blockUser,
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
  toUserId: number;
  fromNickname: string;
  toNickname: string;
  fromAvatar: string | null;
  createdAt: string;
}

interface UserSearchResult {
  id: number;
  nickname: string;
  avatarUrl: string | null;
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [addNickname, setAddNickname] = useState('');
  const [addError, setAddError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');

  const load = () => {
    getFriends().then(setFriends);
    getFriendRequests().then(setIncoming);
    getSentRequests().then(setSent);
  };

  useEffect(() => { load(); }, []);

  const handleSendRequest = async () => {
    if (!addNickname.trim()) return;
    try {
      await sendFriendRequest(addNickname.trim());
      setAddNickname('');
      setAddError('');
      load();
    } catch {
      setAddError('User not found or request already sent');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
      setSearchError('');
    } catch {
      setSearchError('Search failed');
      setSearchResults([]);
    }
  };

  const handleMessage = async (userId: number) => {
    const conv = await startConversation(userId);
    navigate('/chats', { state: { conversationId: conv.id } });
  };

  const handleBlock = async (userId: number, nickname: string) => {
    if (!window.confirm(`Block ${nickname}?`)) return;
    await blockUser(userId);
    load();
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
              value={addNickname}
              onChange={(e) => setAddNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
            <button onClick={handleSendRequest}>Add</button>
            {addError && <span className="error">{addError}</span>}
          </div>
        </div>
        <div className="tabs">
          <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>Friends ({friends.length})</button>
          <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Requests ({incoming.length})</button>
          <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Search People</button>
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
                  <button className="danger" onClick={() => handleBlock(f.userId, f.nickname)}>Block</button>
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
                <span>{r.toNickname}</span>
                <span className="tag">Pending</span>
              </div>
            ))}
            {sent.length === 0 && <p className="empty">No sent requests</p>}
          </div>
        )}

        {tab === 'search' && (
          <div className="search-people">
            <div className="search-bar">
              <input
                placeholder="Search by nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>Search</button>
              {searchError && <span className="error">{searchError}</span>}
            </div>
            <div className="search-results">
              {searchResults.map((u) => (
                <div key={u.id} className="search-result-item">
                  <div className="friend-avatar">
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span>{u.nickname[0]}</span>}
                  </div>
                  <div className="friend-info">
                    <strong>{u.nickname}</strong>
                  </div>
                  <div className="friend-actions">
                    <button onClick={() => navigate(`/profile/${u.id}`)}>View Profile</button>
                    <button onClick={async () => {
                      try {
                        await sendFriendRequest(u.nickname);
                        alert('Friend request sent!');
                      } catch {
                        alert('Request already sent or user not available');
                      }
                    }}>Add Friend</button>
                    <button onClick={() => handleMessage(u.id)}>Message</button>
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && <p className="empty">No results found</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
