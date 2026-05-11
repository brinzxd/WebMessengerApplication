import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { getConversations, getMessages, sendMessage, deleteMessage } from '../api/api';
import { connectWS, sendWsMessage, disconnectWS } from '../ws/wsClient';
import { IMessage } from '@stomp/stompjs';
import Sidebar from '../components/Sidebar';

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Conversation | null>(null);

  // Keep selectedRef in sync so WS handler always sees latest
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    getConversations().then(setConversations);
    const client = connectWS((msg: IMessage) => {
      const newMsg: Message = JSON.parse(msg.body);
      setMessages((prev) => {
        // Avoid duplicate if REST response already added this message
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      getConversations().then(setConversations);
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

  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    const content = text.trim();
    setText('');
    try {
      // Send only via REST; WebSocket subscription will push the message back
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
      setText(content); // restore text so user doesn't lose it
    }
  };

  const handleDelete = async (forAll: boolean) => {
    if (!deleteTarget || !selected) return;
    await deleteMessage(deleteTarget.id, forAll);
    setDeleteTarget(null);
    getMessages(selected.id).then(setMessages);
  };

  return (
    <div className="app-layout">
      <Sidebar active="chats" />
      <div className="chat-list">
        <h2>Chats</h2>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`chat-item ${selected?.id === c.id ? 'active' : ''}`}
            onClick={() => setSelected(c)}
          >
            <div className="chat-avatar">
              {c.otherAvatar ? <img src={c.otherAvatar} alt="" /> : <span>{c.otherNickname[0]}</span>}
            </div>
            <div className="chat-info">
              <strong>{c.otherNickname}</strong>
              <p>{c.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-window">
        {selected ? (
          <>
            <div className="chat-header"><strong>{selected.otherNickname}</strong></div>
            <div className="messages-container">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`message ${m.senderId === userId ? 'mine' : 'theirs'}`}
                  onContextMenu={(e) => { e.preventDefault(); setDeleteTarget(m); }}
                >
                  {m.deletedForAll ? <em>Message deleted</em> : <span className="message-text">{m.content}</span>}
                  <small>{new Date(m.sentAt).toLocaleTimeString()}</small>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="message-input">
              {sendError && <div className="send-error">{sendError}</div>}
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
              />
              <button onClick={handleSend}>Send</button>
            </div>
          </>
        ) : (
          <div className="no-chat">Select a conversation</div>
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
