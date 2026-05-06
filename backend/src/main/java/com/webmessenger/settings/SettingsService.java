package com.webmessenger.settings;

import com.webmessenger.user.UserSettings;
import com.webmessenger.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SettingsService {

  private final UserSettingsRepository userSettingsRepository;

  public UserSettings getSettings(Long userId) {
    return userSettingsRepository.findByUserId(userId)
        .orElseGet(() -> {
          UserSettings s = new UserSettings();
          s.setUserId(userId);
          return userSettingsRepository.save(s);
        });
  }

  @Transactional
  public UserSettings updateMessagingPermission(
      Long userId, UserSettings.MessagingPermission permission) {
    UserSettings s = getSettings(userId);
    s.setWhoCanMessage(permission);
    return userSettingsRepository.save(s);
  }

  @Transactional
  public UserSettings updateStatusVisibility(
      Long userId, UserSettings.StatusVisibility visibility) {
    UserSettings s = getSettings(userId);
    s.setWhoCanSeeStatus(visibility);
    return userSettingsRepository.save(s);
  }

  @Transactional
  public UserSettings blockUser(Long userId, Long targetId) {
    UserSettings s = getSettings(userId);
    List<Long> blocked = s.getBlockedUserIds();
    if (!blocked.contains(targetId)) {
      blocked.add(targetId);
      s.setBlockedUserIds(blocked);
      return userSettingsRepository.save(s);
    }
    return s;
  }

  @Transactional
  public UserSettings unblockUser(Long userId, Long targetId) {
    UserSettings s = getSettings(userId);
    s.getBlockedUserIds().remove(targetId);
    return userSettingsRepository.save(s);
  }
}
