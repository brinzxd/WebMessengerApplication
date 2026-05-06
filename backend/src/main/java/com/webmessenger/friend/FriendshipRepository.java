package com.webmessenger.friend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

  @Query("SELECT f FROM Friendship f WHERE f.user1.id = :uid OR f.user2.id = :uid")
  List<Friendship> findAllByUserId(@Param("uid") Long userId);

  @Query("SELECT f FROM Friendship f WHERE " +
      "(f.user1.id = :u1 AND f.user2.id = :u2) OR " +
      "(f.user1.id = :u2 AND f.user2.id = :u1)")
  Optional<Friendship> findBetween(@Param("u1") Long u1, @Param("u2") Long u2);

  @Query("SELECT COUNT(f) > 0 FROM Friendship f WHERE " +
      "(f.user1.id = :u1 AND f.user2.id = :u2) OR " +
      "(f.user1.id = :u2 AND f.user2.id = :u1)")
  boolean existsBetween(@Param("u1") Long u1, @Param("u2") Long u2);
}
