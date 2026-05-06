package com.webmessenger.chat;

import com.webmessenger.auth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

  private final ChatService chatService;

  /** REST: list all conversations for current user */
  @GetMapping("/conversations")
  public ResponseEntity<List<Conversation>> conversations(
      @AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(chatService.getConversations(principal.getId()));
  }

  /** REST: get or create a direct conversation with another user */
  @PostMapping("/conversations")
  public ResponseEntity<Conversation> openConversation(
      @AuthenticationPrincipal UserPrincipal principal,
      @RequestBody Map<String, Long> body) {
    return ResponseEntity.ok(
        chatService.getOrCreateConversation(principal.getId(), body.get("userId")));
  }

  /** REST: get messages in a conversation */
  @GetMapping("/conversations/{id}/messages")
  public ResponseEntity<List<Message>> messages(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long id) {
    return ResponseEntity.ok(chatService.getMessages(principal.getId(), id));
  }

  /** WebSocket: send a message via STOMP /app/chat/{conversationId} */
  @MessageMapping("/chat/{conversationId}")
  public void handleMessage(
      Principal principal,
      @DestinationVariable Long conversationId,
      @Payload Map<String, String> payload) {
    Long senderId = Long.parseLong(principal.getName());
    chatService.sendMessage(senderId, conversationId, payload.get("content"));
  }

  /** REST: delete message for me */
  @DeleteMapping("/messages/{messageId}/for-me")
  public ResponseEntity<Void> deleteForMe(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long messageId) {
    chatService.deleteMessageForMe(principal.getId(), messageId);
    return ResponseEntity.noContent().build();
  }

  /** REST: delete message for both sides */
  @DeleteMapping("/messages/{messageId}/for-all")
  public ResponseEntity<Void> deleteForAll(
      @AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long messageId) {
    chatService.deleteMessageForAll(principal.getId(), messageId);
    return ResponseEntity.noContent().build();
  }
}
