package com.webmessenger.presence;

import com.webmessenger.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceService {

  private final SimpMessagingTemplate messagingTemplate;
  private final UserRepository userRepository;

  /** userId -> last-seen timestamp as Instant (null = currently online) */
  private final Map<Long, Instant> lastSeen = new ConcurrentHashMap<>();

  public void userConnected(Long userId) {
    lastSeen.put(userId, null); // null means online right now
    broadcastStatus(userId, true, null);
  }

  public void userDisconnected(Long userId) {
    Instant now = Instant.now();
    lastSeen.put(userId, now);
    // Persist to DB — User stores LocalDateTime, so we convert
    userRepository.findById(userId).ifPresent(u -> {
      u.setLastSeenAt(LocalDateTime.ofInstant(now, ZoneOffset.UTC));
      userRepository.save(u);
    });
    broadcastStatus(userId, false, now);
  }

  public PresenceStatus getStatus(Long userId) {
    if (!lastSeen.containsKey(userId)) {
      // Not in memory cache — load from DB and convert LocalDateTime -> Instant
      return userRepository.findById(userId)
          .map(u -> {
            Instant ts = u.getLastSeenAt() != null
                ? u.getLastSeenAt().toInstant(ZoneOffset.UTC)
                : null;
            return new PresenceStatus(userId, false, ts);
          })
          .orElse(new PresenceStatus(userId, false, null));
    }
    Instant ts = lastSeen.get(userId);
    return new PresenceStatus(userId, ts == null, ts);
  }

  private void broadcastStatus(Long userId, boolean online, Instant lastSeenAt) {
    messagingTemplate.convertAndSend("/topic/presence/" + userId,
        new PresenceStatus(userId, online, lastSeenAt));
  }

  public record PresenceStatus(Long userId, boolean online, Instant lastSeen) {}
}
