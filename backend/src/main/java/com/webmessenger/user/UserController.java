package com.webmessenger.user;

import com.webmessenger.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET /api/users/{id}/profile
    @GetMapping("/{id}/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getProfile(id));
    }

    // PUT /api/users/me/nickname  { nickname }
    @PutMapping("/me/nickname")
    public ResponseEntity<User> updateNickname(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            userService.updateNickname(principal.getId(), body.get("nickname")));
    }

    // POST /api/users/me/avatar  (multipart)
    @PostMapping("/me/avatar")
    public ResponseEntity<User> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.uploadAvatar(principal.getId(), file));
    }
}
