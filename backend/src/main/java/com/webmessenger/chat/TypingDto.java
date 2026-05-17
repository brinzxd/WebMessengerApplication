package com.webmessenger.chat;

public class TypingDto {
    public Long conversationId;
    public Long userId;

    public TypingDto() {}

    public TypingDto(Long conversationId, Long userId) {
        this.conversationId = conversationId;
        this.userId = userId;
    }
}
