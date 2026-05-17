package com.webmessenger.presence;

import com.webmessenger.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceService {

  /** A user is considered offline if no HTTP activity arrives within this window. */
  private static final long INACTIVITY_THRESHOLD_MS = 60_000L;

  private final UserRepository userRepository;

  /** Sentinel: userId is mapped to this value while currently online. */
  private static final Instant ONLINE = Instant.MAX;

  /** userId -> last-seen timestamp; ONLINE sentinel means currently active. */
  private final Map<Long, Instant> lastSeen = new ConcurrentHashMap<>();

  /** userId -> epoch millis of last HTTP activity (long-poll request or ping). */
  private final Map<Long, Long> lastActiveAt = new ConcurrentHashMap<>();

  public void userConnected(Long userId) {
    lastSeen.put(userId, ONLINE);
  }

  public void userDisconnected(Long userId) {
    Instant now = Instant.now();
    lastSeen.put(userId, now);
    // Persist to DB — User stores LocalDateTime, so we convert
    userRepository.findById(userId).ifPresent(u -> {
      u.setLastSeenAt(LocalDateTime.ofInstant(now, ZoneOffset.UTC));
      userRepository.save(u);
    });
  }

  /**
   * Marks the user as currently active over HTTP (long-poll request or /presence/ping).
   * Promotes the user to online if they were not already.
   */
  public void recordActivity(Long userId) {
    if (userId == null) return;
    lastActiveAt.put(userId, System.currentTimeMillis());
    Instant prev = lastSeen.get(userId);
    if (prev != null || !lastSeen.containsKey(userId)) {
      userConnected(userId);
    }
  }

  /** Periodically marks users with no recent HTTP activity as offline. */
  @Scheduled(fixedDelay = 15_000L)
  public void sweepInactive() {
    long now = System.currentTimeMillis();
    for (Map.Entry<Long, Long> e : lastActiveAt.entrySet()) {
      if (now - e.getValue() > INACTIVITY_THRESHOLD_MS) {
        Long userId = e.getKey();
        lastActiveAt.remove(userId);
        // Only flip to offline if currently considered online.
        if (ONLINE.equals(lastSeen.get(userId))) {
          userDisconnected(userId);
        }
      }
    }
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
    boolean online = ONLINE.equals(ts);
    return new PresenceStatus(userId, online, online ? null : ts);
  }

  public record PresenceStatus(Long userId, boolean online, Instant lastSeen) {}
}
