package com.webmessenger.user;

import com.webmessenger.friend.Friendship;
import com.webmessenger.friend.FriendshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;

    public Map<String, Object> getProfile(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<Friendship> friendships = friendshipRepository.findByUserId(userId);
        List<Map<String, Object>> friends = friendships.stream().map(f -> {
            User friend = f.getUser1().getId().equals(userId) ? f.getUser2() : f.getUser1();
            return Map.<String, Object>of(
                "userId", friend.getId(),
                "nickname", friend.getNickname(),
                "avatar", friend.getAvatarUrl() != null ? friend.getAvatarUrl() : ""
            );
        }).collect(Collectors.toList());
        return Map.of(
            "userId", user.getId(),
            "nickname", user.getNickname(),
            "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
            "friends", friends
        );
    }

    @Transactional
    public User updateNickname(Long userId, String nickname) {
        if (userRepository.findByNickname(nickname).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nickname already taken");
        }
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setNickname(nickname);
        return userRepository.save(user);
    }

    @Transactional
    public User uploadAvatar(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        try {
            // Store avatar as base64 data URI for simplicity
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            user.setAvatarUrl("data:" + mimeType + ";base64," + base64);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process avatar");
        }
        return userRepository.save(user);
    }
}
