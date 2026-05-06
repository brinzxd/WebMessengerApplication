package com.webmessenger.settings;

import com.webmessenger.auth.UserPrincipal;
import com.webmessenger.user.UserSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

  private final SettingsService settingsService;

  @GetMapping
  public ResponseEntity<UserSettings> get(
      @AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(settingsService.getSettings(principal.getId()));
  }

  @PatchMapping("/messaging")
  public ResponseEntity<UserSettings> updateMessaging(
      @AuthenticationPrincipal UserPrincipal principal,
      @RequestBody Map<String, String> body) {
    UserSettings.MessagingPermission perm =
        UserSettings.MessagingPermission.valueOf(body.get("permission"));
    return ResponseEntity.ok(
        settingsService.updateMessagingPermission(principal.getId(), perm));
  }

  @PatchMapping("/status-visibility")
  public ResponseEntity<UserSettings> updateVisibility(
      @AuthenticationPrincipal UserPrincipal principal,
      @RequestBody Map<String, String> body) {
    UserSettings.StatusVisibility vis =
        UserSettings.StatusVisibility.valueOf(body.get("visibility"));
    return ResponseEntity.ok(
        settingsService.updateStatusVisibility(principal.getId(), vis));
  }

  @PostMapping("/block/{targetId}")
  public ResponseEntity<UserSettings> block(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long targetId) {
    return ResponseEntity.ok(settingsService.blockUser(principal.getId(), targetId));
  }

  @DeleteMapping("/block/{targetId}")
  public ResponseEntity<UserSettings> unblock(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long targetId) {
    return ResponseEntity.ok(settingsService.unblockUser(principal.getId(), targetId));
  }
}
