import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { getConversations, getMessages, sendMessage, deleteMessage, blockUser } from '../api/api';
import { connectWS, disconnectWS } from '../ws/wsClient';
import { IMessage } from '@stomp/stompjs';
import Sidebar from '../components/Sidebar';
import Avatar from '../components/Avatar';

interface Conversation {
  id: number;
  otherUserId: number;
  otherNickname: string;
  otherAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  sentAt: string;
  deletedForAll: boolean;
}

export default function ChatsPage() {
  const { userId } = useAuthStore((s) => s);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [sendError, setSendError] = useState('');
  const [showChatWindow, setShowChatWindow] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Conversation | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    getConversations().then(setConversations);
    connectWS((msg: IMessage) => {
      const newMsg: Message = JSON.parse(msg.body);
      getConversations().then(setConversations);
      if (newMsg.conversationId !== selectedRef.current?.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return () => { disconnectWS(); };
  }, []);

  useEffect(() => {
    if (selected) {
      getMessages(selected.id).then(setMessages);
      setSendError('');
    }
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        setSendError("You can't send messages to this user due to their privacy settings.");
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
    setSelected(null);
    setShowChatWindow(false);
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
            <Avatar src={c.otherAvatar} name={c.otherNickname} size={42} />
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
      <div className={`chat-window ${!showChatWindow && !selected ? 'mobile-hidden' : ''}`}>
        {selected ? (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={handleBack}>←</button>
              <Avatar src={selected.otherAvatar} name={selected.otherNickname} size={36} />
              <strong>{selected.otherNickname}</strong>
              <button
                className="danger"
                style={{ marginLeft: 'auto' }}
                onClick={handleBlock}
              >
                Block
              </button>
            </div>
            <div className="messages-container">
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
                onChange={(e) => { setText(e.target.value); autoResize(); }}
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
