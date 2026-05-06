package com.webmessenger.presence;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

  private final PresenceService presenceService;

  @EventListener
  public void handleConnect(SessionConnectedEvent event) {
    StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
    Principal principal = accessor.getUser();
    if (principal != null) {
      Long userId = Long.parseLong(principal.getName());
      presenceService.userConnected(userId);
    }
  }

  @EventListener
  public void handleDisconnect(SessionDisconnectEvent event) {
    StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
    Principal principal = accessor.getUser();
    if (principal != null) {
      Long userId = Long.parseLong(principal.getName());
      presenceService.userDisconnected(userId);
    }
  }
}
