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

    // POST /api/friends/request  { nickname }
    @PostMapping("/request")
    public ResponseEntity<FriendRequest> sendRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                friendService.sendRequest(principal.getId(), body.get("nickname")));
    }

    // POST /api/friends/request/{id}/accept
    @PostMapping("/request/{id}/accept")
    public ResponseEntity<Void> accept(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        friendService.respondToRequest(id, principal.getId(), true);
        return ResponseEntity.ok().build();
    }

    // POST /api/friends/request/{id}/decline
    @PostMapping("/request/{id}/decline")
    public ResponseEntity<Void> decline(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        friendService.respondToRequest(id, principal.getId(), false);
        return ResponseEntity.ok().build();
    }

    // GET /api/friends/requests/incoming
    @GetMapping("/requests/incoming")
    public ResponseEntity<List<FriendRequestDto>> incoming(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(friendService.getIncomingRequests(principal.getId()));
    }

    // GET /api/friends/requests/sent
    @GetMapping("/requests/sent")
    public ResponseEntity<List<FriendRequestDto>> sent(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(friendService.getSentRequests(principal.getId()));
    }

    // GET /api/friends
    @GetMapping
    public ResponseEntity<List<FriendDto>> list(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(friendService.getFriends(principal.getId()));
    }

    // DELETE /api/friends/{friendshipId}
    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<Void> remove(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long friendshipId) {
        friendService.removeFriend(friendshipId, principal.getId());
        return ResponseEntity.ok().build();
    }
}
