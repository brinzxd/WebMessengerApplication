package com.webmessenger.user;

import com.webmessenger.friend.Friendship;
import com.webmessenger.friend.FriendshipRepository;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String minioBucket;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    public Map<String, Object> getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<Friendship> friendships = friendshipRepository.findByUserId(userId);
        List<Map<String, Object>> friends = friendships.stream().map(f -> {
            User friend = f.getUser1().getId().equals(userId) ? f.getUser2() : f.getUser1();
            return Map.<String, Object>of(
                    "userId", friend.getId(),
                    "nickname", friend.getNickname(),
                    "avatarUrl", friend.getAvatarUrl() != null ? friend.getAvatarUrl() : ""
            );
        }).collect(Collectors.toList());
        return Map.of(
                "id", user.getId(),
                "nickname", user.getNickname(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                "friends", friends
        );
    }

    @Transactional
    public void updateNickname(Long userId, String nickname) {
        if (userRepository.existsByNickname(nickname)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nickname already taken");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setNickname(nickname);
        userRepository.save(user);
    }

    @Transactional
    public String uploadAvatar(Long userId, MultipartFile file) {
        try {
            String objectName = "avatars/" + userId + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioBucket)
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            String publicUrl = minioEndpoint + "/" + minioBucket + "/" + objectName;
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            user.setAvatarUrl(publicUrl);
            userRepository.save(user);
            return publicUrl;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Avatar upload failed: " + e.getMessage());
        }
    }
}
