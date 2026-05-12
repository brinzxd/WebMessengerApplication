import { useEffect, useRef, useState } from 'react';
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
import Avatar from '../components/Avatar';

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

  // Live search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [dropdownResults, setDropdownResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    getFriends().then(setFriends);
    getFriendRequests().then(setIncoming);
    getSentRequests().then(setSent);
  };

  useEffect(() => { load(); }, []);

  // Click-outside to close dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.closest('.search-wrapper')?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  // Live search: fires 300 ms after the user stops typing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSearchError('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setDropdownResults([]);
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results: UserSearchResult[] = await searchUsers(value.trim());
        setDropdownResults(results);
        setShowDropdown(results.length > 0);
        // Also update the main results list shown in the tab
        setSearchResults(results);
      } catch {
        setSearchError('Search failed');
        setDropdownResults([]);
        setShowDropdown(false);
      }
      setIsSearching(false);
    }, 300);
  };

  const handleMessage = async (uId: number) => {
    const conv = await startConversation(uId);
    navigate('/chats', { state: { conversationId: conv.id } });
  };

  const handleBlock = async (uId: number, nickname: string) => {
    if (!window.confirm(`Block ${nickname}?`)) return;
    await blockUser(uId);
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
              placeholder="Add by nickname…"
              value={addNickname}
              onChange={(e) => setAddNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
            <button onClick={handleSendRequest}>Add</button>
            {addError && <span className="error">{addError}</span>}
          </div>
        </div>

        <div className="tabs">
          <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>
            Friends {friends.length > 0 && `(${friends.length})`}
          </button>
          <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
            Requests {incoming.length > 0 && `(${incoming.length})`}
          </button>
          <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>
            Search
          </button>
        </div>

        {/* ---- Friends Tab ---- */}
        {tab === 'friends' && (
          <div className="friend-list">
            {friends.map((f) => (
              <div key={f.friendshipId} className="friend-item">
                <div className="friend-avatar">
                  <Avatar src={f.avatar} name={f.nickname} size={44} />
                  <span className={`status-dot ${f.online ? 'online' : 'offline'}`} />
                </div>
                <div className="friend-info">
                  <strong>{f.nickname}</strong>
                  {!f.online && f.lastSeen && <small>Last seen {f.lastSeen}</small>}
                </div>
                <div className="friend-actions">
                  <button onClick={() => handleMessage(f.userId)}>Message</button>
                  <button className="danger" onClick={() => navigate(`/profile/${f.userId}`)}>Profile</button>
                  <button className="danger" onClick={async () => { await removeFriend(f.friendshipId); load(); }}>Remove</button>
                  <button className="danger" onClick={() => handleBlock(f.userId, f.nickname)}>Block</button>
                </div>
              </div>
            ))}
            {friends.length === 0 && <p className="empty">No friends yet. Add someone!</p>}
          </div>
        )}

        {/* ---- Requests Tab ---- */}
        {tab === 'requests' && (
          <div className="requests-list">
            <h3>Incoming</h3>
            {incoming.map((r) => (
              <div key={r.id} className="request-item">
                <Avatar src={r.fromAvatar} name={r.fromNickname} size={40} />
                <div className="friend-info">
                  <strong>{r.fromNickname}</strong>
                </div>
                <div className="friend-actions">
                  <button onClick={async () => { await acceptFriendRequest(r.id); load(); }}>Accept</button>
                  <button className="danger" onClick={async () => { await declineFriendRequest(r.id); load(); }}>Decline</button>
                </div>
              </div>
            ))}
            {incoming.length === 0 && <p className="empty">No incoming requests</p>}

            <h3>Sent</h3>
            {sent.map((r) => (
              <div key={r.id} className="request-item">
                <Avatar src={null} name={r.toNickname || '?'} size={40} />
                <div className="friend-info">
                  <strong>{r.toNickname}</strong>
                </div>
                <span className="tag">Pending</span>
              </div>
            ))}
            {sent.length === 0 && <p className="empty">No sent requests</p>}
          </div>
        )}

        {/* ---- Search Tab ---- */}
        {tab === 'search' && (
          <div>
            <div className="search-wrapper">
              <div className="search-bar">
                <input
                  ref={searchInputRef}
                  placeholder="Search by nickname…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => dropdownResults.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                />
                {isSearching && <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>…</span>}
                {searchError && <span className="error">{searchError}</span>}
              </div>

              {/* Dropdown */}
              {showDropdown && (
                <div className="search-dropdown">
                  {dropdownResults.length > 0 ? dropdownResults.map((u) => (
                    <div
                      key={u.id}
                      className="search-dropdown-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowDropdown(false);
                        navigate(`/profile/${u.id}`);
                      }}
                    >
                      <Avatar src={u.avatarUrl} name={u.nickname} size={32} />
                      <span>{u.nickname}</span>
                    </div>
                  )) : (
                    <div className="search-dropdown-empty">No users found</div>
                  )}
                </div>
              )}
            </div>

            {/* Full results list */}
            <div className="search-results">
              {searchResults.map((u) => (
                <div key={u.id} className="search-result-item">
                  <Avatar src={u.avatarUrl} name={u.nickname} size={44} />
                  <div className="friend-info">
                    <strong>{u.nickname}</strong>
                  </div>
                  <div className="friend-actions">
                    <button onClick={() => navigate(`/profile/${u.id}`)}>Profile</button>
                    <button onClick={async () => {
                      try {
                        await sendFriendRequest(u.nickname);
                        alert('Friend request sent!');
                      } catch {
                        alert('Request already sent or unavailable');
                      }
                    }}>Add Friend</button>
                    <button onClick={() => handleMessage(u.id)}>Message</button>
                  </div>
                </div>
              ))}
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <p className="empty">No results for "{searchQuery}"</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
