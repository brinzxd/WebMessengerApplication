package com.webmessenger.chat;

import java.time.Instant;

public class MessageDto {
    public Long id;
    public Long senderId;
    public String content;
    public Instant sentAt;
    public boolean deletedForAll;
    public Long conversationId;

    public MessageDto(Long id, Long senderId, String content, Instant sentAt,
                      boolean deletedForAll, Long conversationId) {
        this.id = id;
        this.senderId = senderId;
        this.content = content;
        this.sentAt = sentAt;
        this.deletedForAll = deletedForAll;
        this.conversationId = conversationId;
    }
}
