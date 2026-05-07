package com.webmessenger.chat;

import java.time.Instant;

public class ConversationDto {
    public Long id;
    public Long otherUserId;
    public String otherNickname;
    public String otherAvatar;
    public String lastMessage;
    public Instant lastMessageTime;

    public ConversationDto(Long id, Long otherUserId, String otherNickname, String otherAvatar,
                           String lastMessage, Instant lastMessageTime) {
        this.id = id;
        this.otherUserId = otherUserId;
        this.otherNickname = otherNickname;
        this.otherAvatar = otherAvatar;
        this.lastMessage = lastMessage;
        this.lastMessageTime = lastMessageTime;
    }
}
