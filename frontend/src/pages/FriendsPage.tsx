import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFriends, getFriendRequests, getSentRequests,
  acceptFriendRequest, declineFriendRequest,
  searchUsers,
} from '../api/api';
import Sidebar from '../components/Sidebar';
import Avatar from '../components/Avatar';
import ProfileOverlay from '../components/ProfileOverlay';

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

function formatLastSeen(ts: string | null | undefined): string {
  if (!ts) return 'a long time ago';
  const date = new Date(typeof ts === 'number' ? (ts as number) * 1000 : ts);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [overlayUserId, setOverlayUserId] = useState<number | null>(null);

  // Live search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [dropdownResults, setDropdownResults] = useState<UserSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    getFriends().then(setFriends).catch(() => {});
    getFriendRequests().then(setIncoming).catch(() => {});
    getSentRequests().then(setSent).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!searchInputRef.current?.closest('.search-wrapper')?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        setSearchResults(results);
      } catch {
        setSearchError('Search failed');
        setDropdownResults([]);
        setShowDropdown(false);
      }
      setIsSearching(false);
    }, 300);
  };

  return (
    <div className="app-layout">
      <Sidebar active="friends" />
      <div className="main-content">

        <div className="page-header">
          <h2>Friends</h2>
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
              <div
                key={f.friendshipId}
                className="friend-item"
                style={{ cursor: 'pointer' }}
                onClick={() => setOverlayUserId(f.userId)}
              >
                <div className="friend-avatar">
                  <Avatar src={f.avatar} name={f.nickname} size={44} />
                  <span className={`status-dot ${f.online ? 'online' : 'offline'}`} />
                </div>
                <div className="friend-info">
                  <strong>{f.nickname}</strong>
                  {!f.online && <small>{formatLastSeen(f.lastSeen)}</small>}
                </div>
              </div>
            ))}
            {friends.length === 0 && <p className="empty">No friends yet. Search for someone!</p>}
          </div>
        )}

        {/* ---- Requests Tab ---- */}
        {tab === 'requests' && (
          <div className="requests-list">
            <h3>Incoming</h3>
            {incoming.map((r) => (
              <div key={r.id} className="request-item">
                <Avatar src={r.fromAvatar} name={r.fromNickname} size={40} />
                <div className="friend-info"><strong>{r.fromNickname}</strong></div>
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
                <div className="friend-info"><strong>{r.toNickname}</strong></div>
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

              {showDropdown && (
                <div className="search-dropdown">
                  {dropdownResults.map((u) => (
                    <div
                      key={u.id}
                      className="search-dropdown-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowDropdown(false);
                        setOverlayUserId(u.id);
                      }}
                    >
                      <Avatar src={u.avatarUrl} name={u.nickname} size={32} />
                      <span>{u.nickname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="search-results">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="search-result-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOverlayUserId(u.id)}
                >
                  <Avatar src={u.avatarUrl} name={u.nickname} size={44} />
                  <div className="friend-info"><strong>{u.nickname}</strong></div>
                </div>
              ))}
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <p className="empty">No results for "{searchQuery}"</p>
              )}
            </div>
          </div>
        )}

        {/* Profile overlay */}
        {overlayUserId !== null && (
          <ProfileOverlay
            userId={overlayUserId}
            onClose={() => { setOverlayUserId(null); load(); }}
            onMessage={(convId) => navigate('/chats', { state: { conversationId: convId } })}
          />
        )}

      </div>
    </div>
  );
}
