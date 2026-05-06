import { Client, IMessage } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';

let client: Client | null = null;

export function connectWS(onMessage: (msg: IMessage) => void): Client {
  const token = useAuthStore.getState().token;
  const userId = useAuthStore.getState().userId;

  client = new Client({
    brokerURL: `ws://${window.location.host}/ws`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    onConnect: () => {
      // Subscribe to personal message queue
      client!.subscribe(`/user/${userId}/queue/messages`, onMessage);
    },
    reconnectDelay: 5000,
  });

  client.activate();
  return client;
}

export function sendWsMessage(conversationId: number, content: string) {
  client?.publish({
    destination: `/app/chat/${conversationId}`,
    body: JSON.stringify({ content }),
  });
}

export function disconnectWS() {
  client?.deactivate();
  client = null;
}
