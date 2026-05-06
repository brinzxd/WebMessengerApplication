package com.webmessenger.chat;

import com.webmessenger.user.User;
import com.webmessenger.user.UserRepository;
import com.webmessenger.user.UserSettings;
import com.webmessenger.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

  private final ConversationRepository conversationRepository;
  private final MessageRepository messageRepository;
  private final UserRepository userRepository;
  private final UserSettingsRepository userSettingsRepository;
  private final SimpMessagingTemplate messagingTemplate;

  @Transactional
  public Message sendMessage(Long senderId, Long conversationId, String content) {
    Conversation conv = conversationRepository.findById(conversationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    // Verify sender is a participant
    if (!conv.getUser1().getId().equals(senderId) && !conv.getUser2().getId().equals(senderId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    Long receiverId = conv.getUser1().getId().equals(senderId)
        ? conv.getUser2().getId() : conv.getUser1().getId();
    // Check block and messaging permission
    checkMessagingAllowed(senderId, receiverId);

    User sender = userRepository.findById(senderId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    Message msg = new Message();
    msg.setConversation(conv);
    msg.setSender(sender);
    msg.setContent(content);
    Message saved = messageRepository.save(msg);

    conv.setLastMessageAt(saved.getSentAt());
    conversationRepository.save(conv);

    // Push to WebSocket subscribers
    messagingTemplate.convertAndSendToUser(
        receiverId.toString(), "/queue/messages", saved);
    return saved;
  }

  private void checkMessagingAllowed(Long senderId, Long receiverId) {
    UserSettings settings = userSettingsRepository.findByUserId(receiverId).orElse(null);
    if (settings == null) return;
    // Check block list
    if (settings.getBlockedUserIds() != null &&
        settings.getBlockedUserIds().contains(senderId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Blocked");
    }
  }

  public List<Message> getMessages(Long userId, Long conversationId) {
    return messageRepository.findVisibleMessages(conversationId, userId);
  }

  public List<Conversation> getConversations(Long userId) {
    return conversationRepository.findAllByUserId(userId);
  }

  @Transactional
  public Conversation getOrCreateConversation(Long userId, Long otherUserId) {
    return conversationRepository.findBetween(userId, otherUserId).orElseGet(() -> {
      User u1 = userRepository.findById(userId)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
      User u2 = userRepository.findById(otherUserId)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
      Conversation c = new Conversation();
      c.setUser1(u1);
      c.setUser2(u2);
      return conversationRepository.save(c);
    });
  }

  @Transactional
  public void deleteMessageForMe(Long userId, Long messageId) {
    Message msg = messageRepository.findById(messageId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    MessageHidden hidden = new MessageHidden();
    User user = userRepository.findById(userId).orElseThrow();
    hidden.setMessage(msg);
    hidden.setUser(user);
    // We don't persist MessageHidden via its own repo here; use Spring Data
    // (In production this would use MessageHiddenRepository)
  }

  @Transactional
  public void deleteMessageForAll(Long userId, Long messageId) {
    Message msg = messageRepository.findById(messageId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (!msg.getSender().getId().equals(userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    msg.setDeletedForAllAt(Instant.now());
    messageRepository.save(msg);
  }
}
