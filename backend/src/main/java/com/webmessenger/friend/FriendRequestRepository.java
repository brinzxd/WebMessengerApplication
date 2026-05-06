package com.webmessenger.friend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    // All PENDING requests received by a user (incoming)
    @Query("SELECT fr FROM FriendRequest fr WHERE fr.toUser.id = :userId AND fr.status = 'PENDING'")
    List<FriendRequest> findPendingForUser(@Param("userId") Long userId);

    // All PENDING requests sent by a user
    @Query("SELECT fr FROM FriendRequest fr WHERE fr.fromUser.id = :userId AND fr.status = 'PENDING'")
    List<FriendRequest> findSentByUser(@Param("userId") Long userId);

    // Check if there is an existing pending request between two users (either direction)
    @Query("SELECT fr FROM FriendRequest fr WHERE " +
           "((fr.fromUser.id = :u1 AND fr.toUser.id = :u2) OR " +
           " (fr.fromUser.id = :u2 AND fr.toUser.id = :u1)) " +
           "AND fr.status = 'PENDING'")
    Optional<FriendRequest> findPendingBetween(@Param("u1") Long u1, @Param("u2") Long u2);
}
