package com.webmessenger.friend;

import com.webmessenger.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

  private final FriendService friendService;

  @PostMapping("/request")
  public ResponseEntity<FriendRequest> sendRequest(
      @AuthenticationPrincipal UserPrincipal principal,
      @RequestBody Map<String, String> body) {
    return ResponseEntity.ok(
        friendService.sendRequest(principal.getId(), body.get("nickname")));
  }

  @PostMapping("/request/{id}/respond")
  public ResponseEntity<Void> respond(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long id,
      @RequestParam boolean accept) {
    friendService.respondToRequest(id, principal.getId(), accept);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/requests/pending")
  public ResponseEntity<List<FriendRequest>> pending(
      @AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(friendService.getPendingRequests(principal.getId()));
  }

  @GetMapping
  public ResponseEntity<List<Friendship>> list(
      @AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(friendService.getFriends(principal.getId()));
  }

  @DeleteMapping("/{friendId}")
  public ResponseEntity<Void> remove(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long friendId) {
    friendService.removeFriend(principal.getId(), friendId);
    return ResponseEntity.noContent().build();
  }
}
