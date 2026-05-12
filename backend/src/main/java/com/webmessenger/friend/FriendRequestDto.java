package com.webmessenger.friend;

import java.time.Instant;

public class FriendRequestDto {
    public Long id;
    public Long fromUserId;
    public String fromNickname;
    public String fromAvatar;
    public Long toUserId;
    public String toNickname;
    public Instant createdAt;

    public FriendRequestDto(Long id,
                            Long fromUserId, String fromNickname, String fromAvatar,
                            Long toUserId, String toNickname,
                            Instant createdAt) {
        this.id = id;
        this.fromUserId = fromUserId;
        this.fromNickname = fromNickname;
        this.fromAvatar = fromAvatar;
        this.toUserId = toUserId;
        this.toNickname = toNickname;
        this.createdAt = createdAt;
    }
}
