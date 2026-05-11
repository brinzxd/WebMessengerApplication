package com.webmessenger.settings;

import com.webmessenger.user.BlockedUser;
import com.webmessenger.user.BlockedUserRepository;
import com.webmessenger.user.User;
import com.webmessenger.user.UserRepository;
import com.webmessenger.user.UserSettings;
import com.webmessenger.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SettingsService {
    private final UserSettingsRepository userSettingsRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final UserRepository userRepository;

    public SettingsResponse getSettings(Long userId) {
        UserSettings s = userSettingsRepository.findByUserId(userId)
            .orElseGet(() -> {
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                UserSettings created = UserSettings.builder().user(user).build();
                return userSettingsRepository.save(created);
            });
        return toResponse(s);
    }

    @Transactional
    public SettingsResponse updateSettings(Long userId, String whoCanMessage, String onlineVisibility) {
        UserSettings s = userSettingsRepository.findByUserId(userId)
            .orElseGet(() -> {
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                UserSettings created = UserSettings.builder().user(user).build();
                return userSettingsRepository.save(created);
            });
        if (whoCanMessage != null) {
            s.setWhoCanMessage(UserSettings.MessagingPermission.valueOf(whoCanMessage));
        }
        if (onlineVisibility != null) {
            s.setOnlineVisibility(UserSettings.OnlineVisibility.valueOf(onlineVisibility));
        }
        return toResponse(userSettingsRepository.save(s));
    }

    public List<BlockedUserResponse> getBlockedUsers(Long userId) {
        return blockedUserRepository.findByBlockerId(userId)
            .stream()
            .map(BlockedUser::getBlocked)
            .map(u -> new BlockedUserResponse(u.getId(), u.getNickname(), u.getAvatarUrl()))
            .collect(Collectors.toList());
    }

    @Transactional
    public void blockUser(Long blockerId, Long blockedId) {
        if (blockedUserRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) return;
        User blocker = userRepository.findById(blockerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User blocked = userRepository.findById(blockedId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        BlockedUser b = new BlockedUser();
        b.setBlocker(blocker);
        b.setBlocked(blocked);
        blockedUserRepository.save(b);
    }

    @Transactional
    public void unblockUser(Long blockerId, Long blockedId) {
        blockedUserRepository.deleteByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    public boolean isBlocked(Long senderId, Long receiverId) {
        return blockedUserRepository.existsByBlockerIdAndBlockedId(receiverId, senderId);
    }

    private SettingsResponse toResponse(UserSettings s) {
        return new SettingsResponse(
            s.getWhoCanMessage().name(),
            s.getOnlineVisibility().name()
        );
    }
}
