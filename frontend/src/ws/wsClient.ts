/**
 * Real-time channel for the chat page, built on HTTP long polling.
 *
 * The exported API and callback shape ({ body: string }) are kept identical
 * to the previous STOMP-based version so ChatsPage doesn't need to change
 * how it parses messages.
 *
 * Architecture:
 *   - connectWS(onMessage, onTyping)         — registers callbacks
 *   - setActiveConversation(convId, lastId)  — (re)starts the message+typing
 *                                              long-poll loops for the opened chat
 *   - sendWsTyping(convId)                   — POST typing signal (throttled)
 *   - disconnectWS()                         — aborts loops and clears callbacks
 *
 * Each loop calls GET /api/chat/conversations/{id}/messages?afterMessageId=N&wait=25000
 * (or .../typing?wait=15000). The server holds the request open until new data
 * arrives or the timeout fires, at which point we immediately re-issue it.
 */
import { useAuthStore } from '../store/authStore';

type MsgLike = { body: string };

const API_BASE = '/api';
const MESSAGES_WAIT_MS = 25_000;
const TYPING_WAIT_MS = 15_000;
const RETRY_DELAY_MS = 2_000;
const TYPING_THROTTLE_MS = 1_000;

let onMessageCb: ((msg: MsgLike) => void) | null = null;
let onTypingCb: ((msg: MsgLike) => void) | null = null;

let activeConvId: number | null = null;
let lastMessageId: number = 0;
let loopGeneration = 0;

let messagesAbort: AbortController | null = null;
let typingAbort: AbortController | null = null;

let lastTypingSentAt = 0;

export function connectWS(
  onMessage: (msg: MsgLike) => void,
  onTyping?: (msg: MsgLike) => void
): void {
  onMessageCb = onMessage;
  onTypingCb = onTyping ?? null;
}

export function setActiveConversation(convId: number | null, initialLastMessageId: number): void {
  // Cancel any in-flight polls; bumping the generation also stops their loops.
  loopGeneration += 1;
  messagesAbort?.abort();
  typingAbort?.abort();
  messagesAbort = null;
  typingAbort = null;

  activeConvId = convId;
  lastMessageId = initialLastMessageId;

  if (convId !== null) {
    const gen = loopGeneration;
    void runMessagesLoop(convId, gen);
    void runTypingLoop(convId, gen);
  }
}

export function sendWsTyping(conversationId: number): void {
  const now = Date.now();
  if (now - lastTypingSentAt < TYPING_THROTTLE_MS) return;
  lastTypingSentAt = now;
  const token = useAuthStore.getState().token;
  if (!token) return;
  fetch(`${API_BASE}/chat/conversations/${conversationId}/typing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => { /* swallow — typing is best-effort */ });
}

export function disconnectWS(): void {
  loopGeneration += 1;
  activeConvId = null;
  messagesAbort?.abort();
  typingAbort?.abort();
  messagesAbort = null;
  typingAbort = null;
  onMessageCb = null;
  onTypingCb = null;
}

async function runMessagesLoop(convId: number, gen: number): Promise<void> {
  while (gen === loopGeneration && activeConvId === convId) {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const controller = new AbortController();
    messagesAbort = controller;
    try {
      const res = await fetch(
        `${API_BASE}/chat/conversations/${convId}/messages` +
          `?afterMessageId=${lastMessageId}&wait=${MESSAGES_WAIT_MS}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }
      );
      if (gen !== loopGeneration || activeConvId !== convId) return;
      if (res.status === 401) {
        useAuthStore.getState().logout();
        return;
      }
      if (!res.ok) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      const msgs: Array<{ id: number; [k: string]: unknown }> = await res.json();
      for (const m of msgs) {
        if (typeof m.id === 'number' && m.id > lastMessageId) {
          lastMessageId = m.id;
        }
        onMessageCb?.({ body: JSON.stringify(m) });
      }
    } catch (e: unknown) {
      if (isAbort(e)) return;
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function runTypingLoop(convId: number, gen: number): Promise<void> {
  while (gen === loopGeneration && activeConvId === convId) {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const controller = new AbortController();
    typingAbort = controller;
    try {
      const res = await fetch(
        `${API_BASE}/chat/conversations/${convId}/typing?wait=${TYPING_WAIT_MS}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }
      );
      if (gen !== loopGeneration || activeConvId !== convId) return;
      if (res.status === 401) {
        useAuthStore.getState().logout();
        return;
      }
      if (res.status === 204) {
        // timeout — nobody typing, just re-poll
        continue;
      }
      if (!res.ok) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      const payload = await res.json();
      onTypingCb?.({ body: JSON.stringify(payload) });
    } catch (e: unknown) {
      if (isAbort(e)) return;
      await sleep(RETRY_DELAY_MS);
    }
  }
}

function isAbort(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
