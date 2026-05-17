package com.webmessenger.chat;

import com.webmessenger.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /** REST: list all conversations for current user */
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDto>> conversations(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(chatService.getConversations(principal.getId()));
    }

    /** REST: get or create a direct conversation with another user */
    @PostMapping("/conversations")
    public ResponseEntity<ConversationDto> openConversation(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Long> body) {
        Long otherUserId = body.get("userId");
        return ResponseEntity.ok(chatService.getOrCreateConversation(principal.getId(), otherUserId));
    }

    /**
     * REST: get messages in a conversation.
     *
     * Modes:
     *  - no params                   -> full visible history (immediate).
     *  - ?afterMessageId=N           -> messages with id > N (immediate).
     *  - ?afterMessageId=N&wait=ms   -> HTTP long polling: hold the request
     *                                   open until a new message arrives or
     *                                   the timeout fires (then empty list).
     */
    @GetMapping("/conversations/{id}/messages")
    public DeferredResult<ResponseEntity<List<MessageDto>>> messages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam(required = false) Long afterMessageId,
            @RequestParam(required = false, defaultValue = "0") long wait) {
        return chatService.pollMessages(principal.getId(), id, afterMessageId, wait);
    }

    /** REST: send a message */
    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageDto> sendMessageRest(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        MessageDto msg = chatService.sendMessage(principal.getId(), id, body.get("content"));
        return ResponseEntity.ok(msg);
    }

    /** REST: notify that the current user is typing in the conversation. */
    @PostMapping("/conversations/{id}/typing")
    public ResponseEntity<Void> notifyTyping(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        chatService.markTyping(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    /**
     * REST: HTTP long polling for "peer is typing" events.
     *
     *  - returns 200 + {conversationId, userId} when the peer is typing,
     *  - returns 204 No Content on timeout.
     */
    @GetMapping("/conversations/{id}/typing")
    public DeferredResult<ResponseEntity<TypingDto>> pollTyping(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "15000") long wait) {
        return chatService.pollTyping(principal.getId(), id, wait);
    }

    /** REST: delete a message for me only */
    @DeleteMapping("/messages/{messageId}/for-me")
    public ResponseEntity<Void> deleteForMe(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long messageId) {
        chatService.deleteMessageForMe(principal.getId(), messageId);
        return ResponseEntity.ok().build();
    }

    /** REST: delete a message for everyone */
    @DeleteMapping("/messages/{messageId}/for-all")
    public ResponseEntity<Void> deleteForAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long messageId) {
        chatService.deleteMessageForAll(principal.getId(), messageId);
        return ResponseEntity.ok().build();
    }
}
