package com.webmessenger.presence;

import com.webmessenger.user.User;
import com.webmessenger.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceService {

  private final SimpMessagingTemplate messagingTemplate;
  private final UserRepository userRepository;

  /** userId -> last-seen timestamp (null = currently online) */
  private final Map<Long, Instant> lastSeen = new ConcurrentHashMap<>();

  public void userConnected(Long userId) {
    lastSeen.put(userId, null); // null = online
    broadcastStatus(userId, true, null);
  }

  public void userDisconnected(Long userId) {
    Instant now = Instant.now();
    lastSeen.put(userId, now);
    // Persist last_seen to DB
    userRepository.findById(userId).ifPresent(u -> {
      u.setLastSeen(now);
      userRepository.save(u);
    });
    broadcastStatus(userId, false, now);
  }

  public PresenceStatus getStatus(Long userId) {
    if (!lastSeen.containsKey(userId)) {
      // Not in cache - load from DB
      return userRepository.findById(userId)
          .map(u -> new PresenceStatus(userId, false, u.getLastSeen()))
          .orElse(new PresenceStatus(userId, false, null));
    }
    Instant ts = lastSeen.get(userId);
    return new PresenceStatus(userId, ts == null, ts);
  }

  private void broadcastStatus(Long userId, boolean online, Instant lastSeenAt) {
    PresenceStatus status = new PresenceStatus(userId, online, lastSeenAt);
    // Broadcast to topic so subscribers get real-time status
    messagingTemplate.convertAndSend("/topic/presence/" + userId, status);
  }

  public record PresenceStatus(Long userId, boolean online, Instant lastSeen) {}
}
