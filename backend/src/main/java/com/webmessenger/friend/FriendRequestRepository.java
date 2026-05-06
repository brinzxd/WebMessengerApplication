package com.webmessenger.friend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

  List<FriendRequest> findByReceiverIdAndStatus(Long receiverId, FriendRequest.Status status);

  List<FriendRequest> findBySenderIdAndStatus(Long senderId, FriendRequest.Status status);

  @Query("SELECT fr FROM FriendRequest fr WHERE " +
      "((fr.sender.id = :u1 AND fr.receiver.id = :u2) OR " +
      " (fr.sender.id = :u2 AND fr.receiver.id = :u1)) " +
      "AND fr.status = 'PENDING'")
  Optional<FriendRequest> findPendingBetween(@Param("u1") Long u1, @Param("u2") Long u2);
}
