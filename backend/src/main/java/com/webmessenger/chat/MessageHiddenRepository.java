package com.webmessenger.chat;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageHiddenRepository extends JpaRepository<MessageHidden, Long> {
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);
}
