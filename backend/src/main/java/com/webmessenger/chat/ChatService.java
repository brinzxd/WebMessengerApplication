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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageHiddenRepository messageHiddenRepository;
    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private MessageDto toDto(Message m) {
        return new MessageDto(
                m.getId(),
                m.getSender().getId(),
                m.getContent(),
                m.getSentAt(),
                m.getDeletedForAllAt() != null);
    }

    @Transactional
    public MessageDto sendMessage(Long senderId, Long conversationId, String content) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conv.getUser1().getId().equals(senderId) && !conv.getUser2().getId().equals(senderId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
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

        MessageDto dto = toDto(saved);
        messagingTemplate.convertAndSendToUser(
                conv.getUser1().getId().toString(), "/queue/messages", dto);
        messagingTemplate.convertAndSendToUser(
                conv.getUser2().getId().toString(), "/queue/messages", dto);
        return dto;
    }

    private void checkMessagingAllowed(Long senderId, User receiver) {
        UserSettings settings = userSettingsRepository.findByUserId(receiver.getId()).orElse(null);
        if (settings == null) return;
        switch (settings.getWhoCanMessage()) {
            case NO_ONE -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User does not accept messages");
            case FRIENDS_ONLY -> { /* TODO: check friendship */ }
            default -> { /* EVERYONE - allow */ }
        }
    }

    public List<MessageDto> getMessages(Long userId, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conv.getUser1().getId().equals(userId) && !conv.getUser2().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId).stream()
                .filter(m -> m.getDeletedForAllAt() == null)
                .filter(m -> !messageHiddenRepository.existsByMessageIdAndUserId(m.getId(), userId))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<ConversationDto> getConversations(Long userId) {
        return conversationRepository.findAllByUserId(userId).stream()
                .map(conv -> {
                    User other = conv.getUser1().getId().equals(userId) ? conv.getUser2() : conv.getUser1();
                    Message lastMsg = messageRepository
                            .findTopByConversationIdOrderBySentAtDesc(conv.getId())
                            .orElse(null);
                    return new ConversationDto(
                            conv.getId(),
                            other.getId(),
                            other.getNickname(),
                            other.getAvatarUrl(),
                            lastMsg != null ? lastMsg.getContent() : null,
                            conv.getLastMessageAt());
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public ConversationDto getOrCreateConversation(Long userId1, Long userId2) {
        Conversation conv = conversationRepository.findBetween(userId1, userId2)
                .orElseGet(() -> {
                    User u1 = userRepository.findById(userId1)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                    User u2 = userRepository.findById(userId2)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                    Conversation c = new Conversation();
                    c.setUser1(u1);
                    c.setUser2(u2);
                    return conversationRepository.save(c);
                });
        User other = conv.getUser1().getId().equals(userId1) ? conv.getUser2() : conv.getUser1();
        Message lastMsg = messageRepository
                .findTopByConversationIdOrderBySentAtDesc(conv.getId())
                .orElse(null);
        return new ConversationDto(
                conv.getId(),
                other.getId(),
                other.getNickname(),
                other.getAvatarUrl(),
                lastMsg != null ? lastMsg.getContent() : null,
                conv.getLastMessageAt());
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
        Conversation conv = msg.getConversation();
        messagingTemplate.convertAndSendToUser(
                conv.getUser1().getId().toString(), "/queue/message-deleted", messageId);
        messagingTemplate.convertAndSendToUser(
                conv.getUser2().getId().toString(), "/queue/message-deleted", messageId);
    }
}
