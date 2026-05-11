package com.webmessenger.settings;

import com.webmessenger.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {
    private final SettingsService settingsService;

    // GET /api/settings
    @GetMapping
    public ResponseEntity<SettingsResponse> get(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(settingsService.getSettings(principal.getId()));
    }

    // PUT /api/settings { whoCanMessage, onlineVisibility }
    @PutMapping
    public ResponseEntity<SettingsResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(settingsService.updateSettings(
                principal.getId(),
                body.get("whoCanMessage"),
                body.get("onlineVisibility")));
    }

    // GET /api/settings/blocked
    @GetMapping("/blocked")
    public ResponseEntity<List<BlockedUserResponse>> getBlocked(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(settingsService.getBlockedUsers(principal.getId()));
    }

    // POST /api/settings/block/{userId}
    @PostMapping("/block/{userId}")
    public ResponseEntity<Void> block(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long userId) {
        settingsService.blockUser(principal.getId(), userId);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/settings/block/{userId}
    @DeleteMapping("/block/{userId}")
    public ResponseEntity<Void> unblock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long userId) {
        settingsService.unblockUser(principal.getId(), userId);
        return ResponseEntity.ok().build();
    }
}
