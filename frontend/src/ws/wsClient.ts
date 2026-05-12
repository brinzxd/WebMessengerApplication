import { Client, IMessage } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';

let client: Client | null = null;
let subscription: ReturnType<Client['subscribe']> | null = null;

export function connectWS(onMessage: (msg: IMessage) => void): Client {
  const token = useAuthStore.getState().token;

  client = new Client({
    brokerURL: `ws://${window.location.host}/ws`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    onConnect: () => {
      // Unsubscribe previous subscription before creating a new one (handles reconnects)
      if (subscription) {
        subscription.unsubscribe();
      }
      subscription = client!.subscribe(`/user/queue/messages`, onMessage);
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
  subscription?.unsubscribe();
  subscription = null;
  client?.deactivate();
  client = null;
}
