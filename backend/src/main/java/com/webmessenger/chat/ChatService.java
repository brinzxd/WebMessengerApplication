package com.webmessenger.chat;

import com.webmessenger.friend.FriendshipRepository;
import com.webmessenger.presence.PresenceService;
import com.webmessenger.user.BlockedUserRepository;
import com.webmessenger.user.User;
import com.webmessenger.user.UserRepository;
import com.webmessenger.user.UserSettings;
import com.webmessenger.user.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.context.request.async.DeferredResult;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageHiddenRepository messageHiddenRepository;
    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final FriendshipRepository friendshipRepository;
    private final PresenceService presenceService;

    /** Per-conversation long-poll waiters for new messages. */
    private final Map<Long, List<MessageWaiter>> messageWaiters = new ConcurrentHashMap<>();

    /** Per-conversation: userId -> epoch millis at which the "typing" state expires. */
    private final Map<Long, Map<Long, Long>> typingState = new ConcurrentHashMap<>();

    /** Per-conversation long-poll waiters for typing events. */
    private final Map<Long, List<TypingWaiter>> typingWaiters = new ConcurrentHashMap<>();

    /** Lifetime (ms) of a single "typing" signal. */
    private static final long TYPING_TTL_MS = 3_000L;

    private record MessageWaiter(
            Long userId,
            Long afterMessageId,
            DeferredResult<ResponseEntity<List<MessageDto>>> result) {}

    private record TypingWaiter(
            Long userId,
            DeferredResult<ResponseEntity<TypingDto>> result) {}

    private MessageDto toDto(Message m) {
        return new MessageDto(
                m.getId(),
                m.getSender().getId(),
                m.getContent(),
                m.getSentAt(),
                m.getDeletedForAllAt() != null,
                m.getConversation().getId());
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
        final Long convId = conv.getId();
        clearTyping(convId, senderId);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    notifyMessageWaiters(convId);
                }
            });
        } else {
            notifyMessageWaiters(convId);
        }
        return dto;
    }

    private void checkMessagingAllowed(Long senderId, User receiver) {
        if (blockedUserRepository.existsByBlockerIdAndBlockedId(receiver.getId(), senderId) ||
            blockedUserRepository.existsByBlockerIdAndBlockedId(senderId, receiver.getId())) {
            throw new ResponseStatusException(HttpStatusCode.valueOf(451), "Blocked");
        }
        UserSettings settings = userSettingsRepository.findByUserId(receiver.getId()).orElse(null);
        if (settings == null) return;
        switch (settings.getWhoCanMessage()) {
            case NO_ONE -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User does not accept messages");
            case FRIENDS_ONLY -> {
                if (!friendshipRepository.existsBetween(senderId, receiver.getId()))
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only friends can message this user");
            }
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

    private List<MessageDto> getMessagesAfter(Long userId, Long conversationId, Long afterMessageId) {
        return messageRepository
                .findVisibleMessagesAfter(conversationId, userId, afterMessageId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * HTTP long polling for new messages.
     *
     * Behavior:
     *  - afterMessageId == null  -> immediate full history (backward compatible with old GET).
     *  - afterMessageId != null  -> return messages with id > afterMessageId;
     *      if none and waitMs > 0, hold the request open until a new message
     *      arrives or the timeout fires (then 200 OK with empty list).
     */
    public DeferredResult<ResponseEntity<List<MessageDto>>> pollMessages(
            Long userId, Long conversationId, Long afterMessageId, long waitMs) {

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conv.getUser1().getId().equals(userId) && !conv.getUser2().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        presenceService.recordActivity(userId);

        if (afterMessageId == null) {
            DeferredResult<ResponseEntity<List<MessageDto>>> immediate = new DeferredResult<>();
            immediate.setResult(ResponseEntity.ok(getMessages(userId, conversationId)));
            return immediate;
        }

        List<MessageDto> fresh = getMessagesAfter(userId, conversationId, afterMessageId);
        if (!fresh.isEmpty() || waitMs <= 0) {
            DeferredResult<ResponseEntity<List<MessageDto>>> immediate = new DeferredResult<>();
            immediate.setResult(ResponseEntity.ok(fresh));
            return immediate;
        }

        DeferredResult<ResponseEntity<List<MessageDto>>> result =
                new DeferredResult<>(waitMs, ResponseEntity.ok(Collections.<MessageDto>emptyList()));
        MessageWaiter waiter = new MessageWaiter(userId, afterMessageId, result);
        messageWaiters
                .computeIfAbsent(conversationId, k -> new CopyOnWriteArrayList<>())
                .add(waiter);

        Runnable cleanup = () -> {
            List<MessageWaiter> list = messageWaiters.get(conversationId);
            if (list != null) {
                list.remove(waiter);
                if (list.isEmpty()) messageWaiters.remove(conversationId, list);
            }
        };
        result.onCompletion(cleanup);
        result.onTimeout(cleanup);

        // Race guard: a message could have been committed between our first
        // DB lookup and the waiter registration; re-check once now.
        List<MessageDto> recheck = getMessagesAfter(userId, conversationId, afterMessageId);
        if (!recheck.isEmpty()) {
            result.setResult(ResponseEntity.ok(recheck));
        }
        return result;
    }

    private void notifyMessageWaiters(Long conversationId) {
        List<MessageWaiter> list = messageWaiters.get(conversationId);
        if (list == null || list.isEmpty()) return;
        for (MessageWaiter w : new ArrayList<>(list)) {
            try {
                List<MessageDto> msgs = getMessagesAfter(w.userId(), conversationId, w.afterMessageId());
                if (!msgs.isEmpty()) {
                    w.result().setResult(ResponseEntity.ok(msgs));
                }
            } catch (Exception e) {
                w.result().setErrorResult(e);
            }
        }
    }

    /** Records a "user is typing" signal in the given conversation and wakes up waiters. */
    public void markTyping(Long senderId, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conv.getUser1().getId().equals(senderId) && !conv.getUser2().getId().equals(senderId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        typingState
                .computeIfAbsent(conversationId, k -> new ConcurrentHashMap<>())
                .put(senderId, System.currentTimeMillis() + TYPING_TTL_MS);
        notifyTypingWaiters(conversationId, senderId);
    }

    /**
     * HTTP long polling for "peer is typing" events.
     *
     * Returns immediately with the peer's userId if a fresh typing signal exists,
     * otherwise holds the request open until a signal arrives or the timeout fires
     * (then 204 No Content via null body).
     */
    public DeferredResult<ResponseEntity<TypingDto>> pollTyping(
            Long userId, Long conversationId, long waitMs) {

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!conv.getUser1().getId().equals(userId) && !conv.getUser2().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        presenceService.recordActivity(userId);

        TypingDto fresh = currentTypingPeer(conversationId, userId);
        if (fresh != null || waitMs <= 0) {
            DeferredResult<ResponseEntity<TypingDto>> immediate = new DeferredResult<>();
            immediate.setResult(fresh != null
                    ? ResponseEntity.ok(fresh)
                    : ResponseEntity.noContent().build());
            return immediate;
        }

        DeferredResult<ResponseEntity<TypingDto>> result =
                new DeferredResult<>(waitMs, ResponseEntity.noContent().build());
        TypingWaiter waiter = new TypingWaiter(userId, result);
        typingWaiters
                .computeIfAbsent(conversationId, k -> new CopyOnWriteArrayList<>())
                .add(waiter);

        Runnable cleanup = () -> {
            List<TypingWaiter> list = typingWaiters.get(conversationId);
            if (list != null) {
                list.remove(waiter);
                if (list.isEmpty()) typingWaiters.remove(conversationId, list);
            }
        };
        result.onCompletion(cleanup);
        result.onTimeout(cleanup);

        // Race guard
        TypingDto recheck = currentTypingPeer(conversationId, userId);
        if (recheck != null) {
            result.setResult(ResponseEntity.ok(recheck));
        }
        return result;
    }

    /** Returns a fresh typing signal from any participant other than {@code excludeUserId}, or null. */
    private TypingDto currentTypingPeer(Long conversationId, Long excludeUserId) {
        Map<Long, Long> state = typingState.get(conversationId);
        if (state == null || state.isEmpty()) return null;
        long now = System.currentTimeMillis();
        for (Map.Entry<Long, Long> e : state.entrySet()) {
            if (e.getKey().equals(excludeUserId)) continue;
            if (e.getValue() > now) {
                return new TypingDto(conversationId, e.getKey());
            }
        }
        return null;
    }

    private void notifyTypingWaiters(Long conversationId, Long typingUserId) {
        List<TypingWaiter> list = typingWaiters.get(conversationId);
        if (list == null || list.isEmpty()) return;
        TypingDto payload = new TypingDto(conversationId, typingUserId);
        for (TypingWaiter w : new ArrayList<>(list)) {
            if (typingUserId.equals(w.userId())) continue; // don't echo to the typist
            try {
                w.result().setResult(ResponseEntity.ok(payload));
            } catch (Exception e) {
                w.result().setErrorResult(e);
            }
        }
    }

    private void clearTyping(Long conversationId, Long userId) {
        Map<Long, Long> state = typingState.get(conversationId);
        if (state != null) state.remove(userId);
    }

    public List<ConversationDto> getConversations(Long userId) {
        return conversationRepository.findAllByUserId(userId).stream()
                .map(conv -> {
                    User other = conv.getUser1().getId().equals(userId) ? conv.getUser2() : conv.getUser1();
                    Message lastMsg = messageRepository
                            .findTopByConversationIdOrderBySentAtDesc(conv.getId())
                            .orElse(null);
                    PresenceService.PresenceStatus status = presenceService.getStatus(other.getId());
                    return new ConversationDto(
                            conv.getId(),
                            other.getId(),
                            other.getNickname(),
                            other.getAvatarUrl(),
                            lastMsg != null ? lastMsg.getContent() : null,
                            conv.getLastMessageAt(),
                            status.online(),
                            status.lastSeen());
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
        PresenceService.PresenceStatus status = presenceService.getStatus(other.getId());
        return new ConversationDto(
                conv.getId(),
                other.getId(),
                other.getNickname(),
                other.getAvatarUrl(),
                lastMsg != null ? lastMsg.getContent() : null,
                conv.getLastMessageAt(),
                status.online(),
                status.lastSeen());
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
    }
}
