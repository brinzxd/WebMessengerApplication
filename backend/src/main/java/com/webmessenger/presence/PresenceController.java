package com.webmessenger.presence;

import com.webmessenger.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

  private final PresenceService presenceService;

  /**
   * Heartbeat from the client: marks the user as currently online.
   * The scheduled sweep in PresenceService demotes users back to offline
   * after a period of inactivity.
   */
  @PostMapping("/ping")
  public ResponseEntity<Void> ping(@AuthenticationPrincipal UserPrincipal principal) {
    presenceService.recordActivity(principal.getId());
    return ResponseEntity.noContent().build();
  }
}
