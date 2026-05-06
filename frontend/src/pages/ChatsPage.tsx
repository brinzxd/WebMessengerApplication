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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversations().then(setConversations);
    const client = connectWS((msg: IMessage) => {
      const newMsg: Message = JSON.parse(msg.body);
      setMessages((prev) => [...prev, newMsg]);
      getConversations().then(setConversations);
    });
    return () => { disconnectWS(); };
  }, []);

  useEffect(() => {
    if (selected) {
      getMessages(selected.id).then(setMessages);
    }
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    await sendMessage(selected.id, text);
    sendWsMessage(selected.id, text);
    setText('');
    getMessages(selected.id).then(setMessages);
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
                  {m.deletedForAll ? <em>Message deleted</em> : <span>{m.content}</span>}
                  <small>{new Date(m.sentAt).toLocaleTimeString()}</small>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="message-input">
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
