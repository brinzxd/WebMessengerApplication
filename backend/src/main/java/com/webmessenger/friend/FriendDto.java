package com.webmessenger.friend;

import java.time.Instant;

public class FriendDto {
    public Long friendshipId;
    public Long userId;
    public String nickname;
    public String avatar;
    public boolean online;
    public Instant lastSeen;

    public FriendDto(Long friendshipId, Long userId, String nickname, String avatar, boolean online, Instant lastSeen) {
        this.friendshipId = friendshipId;
        this.userId = userId;
        this.nickname = nickname;
        this.avatar = avatar;
        this.online = online;
        this.lastSeen = lastSeen;
    }
}
