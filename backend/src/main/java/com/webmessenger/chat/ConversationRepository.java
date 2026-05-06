package com.webmessenger.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

  @Query("SELECT c FROM Conversation c WHERE c.user1.id = :uid OR c.user2.id = :uid " +
      "ORDER BY c.lastMessageAt DESC NULLS LAST")
  List<Conversation> findAllByUserId(@Param("uid") Long userId);

  @Query("SELECT c FROM Conversation c WHERE " +
      "(c.user1.id = :u1 AND c.user2.id = :u2) OR " +
      "(c.user1.id = :u2 AND c.user2.id = :u1)")
  Optional<Conversation> findBetween(@Param("u1") Long u1, @Param("u2") Long u2);
}
