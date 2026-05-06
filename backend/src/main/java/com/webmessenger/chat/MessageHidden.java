package com.webmessenger.chat;

import com.webmessenger.user.User;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

/**
 * Tracks messages hidden only for a specific user ("delete for me").
 */
@Data
@Entity
@Table(name = "message_hidden",
    uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "user_id"}))
public class MessageHidden {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "message_id", nullable = false)
  private Message message;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "hidden_at", nullable = false)
  private Instant hiddenAt = Instant.now();
}
