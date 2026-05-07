package com.webmessenger.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderBySentAtAsc(Long conversationId);

    Optional<Message> findTopByConversationIdOrderBySentAtDesc(Long conversationId);

    /**
     * Returns messages visible to the given user:
     * - not deleted for all
     * - not hidden by this specific user
     */
    @Query("SELECT m FROM Message m WHERE m.conversation.id = :convId " +
            "AND m.deletedForAllAt IS NULL " +
            "AND m.id NOT IN (" +
            "  SELECT mh.message.id FROM MessageHidden mh WHERE mh.user.id = :userId" +
            ") ORDER BY m.sentAt ASC")
    List<Message> findVisibleMessages(
            @Param("convId") Long conversationId,
            @Param("userId") Long userId);
}
