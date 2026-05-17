import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getConversations, getMessages, sendMessage, deleteMessage, blockUser, getBlockedUsers, unblockUser } from '../api/api';
import { connectWS, disconnectWS, sendWsTyping, setActiveConversation } from '../ws/wsClient';
import Sidebar from '../components/Sidebar';
import Avatar from '../components/Avatar';
import ProfileOverlay from '../components/ProfileOverlay';

interface Conversation {
  id: number;
  otherUserId: number;
  otherNickname: string;
  otherAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  otherOnline: boolean;
  otherLastSeen: string | null;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  sentAt: string;
  deletedForAll: boolean;
}

function formatLastSeen(ts: string | null | undefined): string {
  if (!ts) return '';
  const date = new Date(typeof ts === 'number' ? (ts as number) * 1000 : ts);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'last seen just now';
  if (m < 60) return `last seen ${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `last seen ${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `last seen ${d}d ago`;
  return `last seen ${date.toLocaleDateString()}`;
}

export default function ChatsPage() {
  const { userId } = useAuthStore((s) => s);
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [sendError, setSendError] = useState('');
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [profileOverlayUserId, setProfileOverlayUserId] = useState<number | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Conversation | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    const targetConvId = (location.state as { conversationId?: number } | null)?.conversationId;

    getConversations().then((convs: Conversation[]) => {
      setConversations(convs);
      // Auto-open conversation when navigated from Profile / ProfileOverlay
      if (targetConvId) {
        const target = convs.find((c) => c.id === targetConvId);
        if (target) {
          setSelected(target);
          setShowChatWindow(true);
        }
      }
    });

    connectWS(
      (msg: { body: string }) => {
        const newMsg: Message = JSON.parse(msg.body);
        getConversations().then(setConversations);
        if (newMsg.conversationId !== selectedRef.current?.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      (msg: { body: string }) => {
        const payload = JSON.parse(msg.body) as { conversationId: number };
        if (payload.conversationId !== selectedRef.current?.id) return;
        setPeerTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    );
    return () => { disconnectWS(); };
  }, []);

  // Load messages and block status when conversation changes
  useEffect(() => {
    if (!selected) {
      setActiveConversation(null, 0);
      return;
    }
    const convId = selected.id;
    isInitialLoad.current = true;
    setSendError('');
    setPeerTyping(false);
    getMessages(convId).then((msgs: Message[]) => {
      setMessages(msgs);
      const maxId = msgs.length ? Math.max(...msgs.map((m) => m.id)) : 0;
      setActiveConversation(convId, maxId);
    });
    // Check block status
    getBlockedUsers().then((list: { id: number }[]) => {
      setIsBlocked(list.some((u) => u.id === selected.otherUserId));
    });
  }, [selected?.id]);

  // Scroll to bottom — instant on initial load, smooth for new messages
  useEffect(() => {
    if (!messages.length) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    if (isInitialLoad.current) {
      container.scrollTop = container.scrollHeight;
      isInitialLoad.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelect = (conv: Conversation) => {
    setSelected(conv);
    setShowChatWindow(true);
  };

  const handleBack = () => {
    setShowChatWindow(false);
  };

  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    const content = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await sendMessage(selected.id, content);
      setSendError('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data || '';
      if (typeof msg === 'string' && msg.length > 0) {
        setSendError(msg);
      } else if (err?.response?.status === 403) {
        setSendError("Can't send — privacy settings.");
      } else if (err?.response?.status === 451) {
        setSendError("You are blocked by this user or have blocked them.");
      } else {
        setSendError('Failed to send message.');
      }
      setText(content);
    }
  };

  const handleDelete = async (forAll: boolean) => {
    if (!deleteTarget || !selected) return;
    await deleteMessage(deleteTarget.id, forAll);
    setDeleteTarget(null);
    getMessages(selected.id).then(setMessages);
  };

  const handleBlock = async () => {
    if (!selected) return;
    if (!window.confirm(`Block ${selected.otherNickname}?`)) return;
    await blockUser(selected.otherUserId);
    setIsBlocked(true);
  };

  const handleUnblock = async () => {
    if (!selected) return;
    await unblockUser(selected.otherUserId);
    setIsBlocked(false);
  };

  return (
    <div className="app-layout">
      <Sidebar active="chats" />

      {/* Chat List */}
      <div className={`chat-list ${showChatWindow ? 'mobile-hidden' : ''}`}>
        <h2>Chats</h2>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`chat-item ${selected?.id === c.id ? 'active' : ''}`}
            onClick={() => handleSelect(c)}
          >
            <div style={{ position: 'relative' }}>
              <Avatar src={c.otherAvatar} name={c.otherNickname} size={42} />
              {c.otherOnline && (
                <span className="status-dot online" style={{ position: 'absolute', bottom: 1, right: 1, border: '2px solid var(--bg)' }} />
              )}
            </div>
            <div className="chat-info">
              <strong>{c.otherNickname}</strong>
              <p>{c.lastMessage}</p>
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="empty" style={{ padding: '1.5rem 1rem' }}>No conversations yet</p>
        )}
      </div>

      {/* Chat Window */}
      <div className={`chat-window ${!showChatWindow ? 'mobile-hidden' : ''}`}>
        {selected ? (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={handleBack}>←</button>
              <div
                style={{ cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setProfileOverlayUserId(selected.otherUserId)}
              >
                <Avatar src={selected.otherAvatar} name={selected.otherNickname} size={36} />
              </div>
              <div
                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                onClick={() => setProfileOverlayUserId(selected.otherUserId)}
              >
                <div style={{ fontWeight: 600, fontSize: '0.97rem' }}>{selected.otherNickname}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', lineHeight: 1.2 }}>
                  {peerTyping
                    ? <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>typing...</span>
                    : selected.otherOnline
                      ? <span style={{ color: 'var(--success)' }}>online</span>
                      : formatLastSeen(selected.otherLastSeen)}
                </div>
              </div>
              {isBlocked ? (
                <button onClick={handleUnblock} style={{ marginLeft: 'auto' }}>Unblock</button>
              ) : (
                <button className="danger" style={{ marginLeft: 'auto' }} onClick={handleBlock}>Block</button>
              )}
            </div>

            <div className="messages-container" ref={messagesContainerRef}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`message ${m.senderId === userId ? 'mine' : 'theirs'}`}
                  onContextMenu={(e) => { e.preventDefault(); setDeleteTarget(m); }}
                >
                  {m.deletedForAll
                    ? <em>Message deleted</em>
                    : <span className="message-text">{m.content}</span>}
                  <small>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="message-input">
              {sendError && <div className="send-error">{sendError}</div>}
              <textarea
                ref={textareaRef}
                value={text}
                rows={1}
                onChange={(e) => {
                setText(e.target.value);
                autoResize();
                if (selected) sendWsTyping(selected.id);
              }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message..."
              />
              <button className="send-btn" onClick={handleSend} title="Send">➤</button>
            </div>
          </>
        ) : (
          <div className="no-chat">
            <span className="no-chat-icon">💬</span>
            <span>Select a conversation</span>
          </div>
        )}

        {/* Profile overlay appears inside chat-window */}
        {profileOverlayUserId !== null && (
          <ProfileOverlay
            userId={profileOverlayUserId}
            onClose={() => setProfileOverlayUserId(null)}
            hideMessageButton
          />
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Delete message?</p>
            <button onClick={() => handleDelete(false)}>Delete for me</button>
            <button onClick={() => handleDelete(true)}>Delete for everyone</button>
            <button onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
