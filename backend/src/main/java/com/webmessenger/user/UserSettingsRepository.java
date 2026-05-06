package com.webmessenger.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface UserSettingsRepository extends JpaRepository<UserSettings, Long> {
    @Query("SELECT s FROM UserSettings s WHERE s.user.id = :userId")
    Optional<UserSettings> findByUserId(Long userId);
}
