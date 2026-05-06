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
    private final MessageHiddenRepository messageHiddenRepository;
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
        // Check if receiver allows messages
        User receiver = conv.getUser1().getId().equals(senderId) ? conv.getUser2() : conv.getUser1();
        checkMessagingAllowed(senderId, receiver);

        Message msg = new Message();
        msg.setConversation(conv);
        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        msg.setSender(sender);
        msg.setContent(content);
        msg.setSentAt(Instant.now());
        Message saved = messageRepository.save(msg);

        conv.setLastMessageAt(Instant.now());
        conversationRepository.save(conv);

        // Push to both participants via WebSocket
        messagingTemplate.convertAndSendToUser(
            conv.getUser1().getId().toString(),
            "/queue/messages",
            saved);
        messagingTemplate.convertAndSendToUser(
            conv.getUser2().getId().toString(),
            "/queue/messages",
            saved);

        return saved;
    }

    private void checkMessagingAllowed(Long senderId, User receiver) {
        UserSettings settings = userSettingsRepository.findByUserId(receiver.getId()).orElse(null);
        if (settings == null) return;
        switch (settings.getWhoCanMessage()) {
            case NO_ONE -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User does not accept messages");
            case FRIENDS_ONLY -> {
                // check friendship - simplified: if no exception thrown above, allow
                // Full implementation would check FriendshipRepository
            }
            default -> { /* EVERYONE - allow */ }
        }
    }

    public List<Message> getMessages(Long userId, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conv.getUser1().getId().equals(userId) && !conv.getUser2().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
        // Filter out globally deleted messages and messages hidden for this user
        return messages.stream()
            .filter(m -> m.getDeletedForAllAt() == null)
            .filter(m -> !messageHiddenRepository.existsByMessageIdAndUserId(m.getId(), userId))
            .toList();
    }

    public List<Conversation> getConversations(Long userId) {
        return conversationRepository.findAllByUserId(userId);
    }

    @Transactional
    public Conversation getOrCreateConversation(Long userId1, Long userId2) {
        return conversationRepository.findBetween(userId1, userId2)
            .orElseGet(() -> {
                User u1 = userRepository.findById(userId1)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                User u2 = userRepository.findById(userId2)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                Conversation conv = new Conversation();
                conv.setUser1(u1);
                conv.setUser2(u2);
                return conversationRepository.save(conv);
            });
    }

    @Transactional
    public void deleteMessageForMe(Long userId, Long messageId) {
        Message msg = messageRepository.findById(messageId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Conversation conv = msg.getConversation();
        if (!conv.getUser1().getId().equals(userId) && !conv.getUser2().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        MessageHidden hidden = new MessageHidden();
        hidden.setMessage(msg);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        hidden.setUser(user);
        messageHiddenRepository.save(hidden);
    }

    @Transactional
    public void deleteMessageForAll(Long userId, Long messageId) {
        Message msg = messageRepository.findById(messageId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!msg.getSender().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can delete for everyone");
        }
        msg.setDeletedForAllAt(Instant.now());
        messageRepository.save(msg);
        // notify both participants via STOMP
        Conversation conv = msg.getConversation();
        messagingTemplate.convertAndSendToUser(
            conv.getUser1().getId().toString(),
            "/queue/message-deleted",
            messageId);
        messagingTemplate.convertAndSendToUser(
            conv.getUser2().getId().toString(),
            "/queue/message-deleted",
            messageId);
    }
}
