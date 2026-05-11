package com.webmessenger.settings;

public record BlockedUserResponse(
    Long id,
    String nickname,
    String avatarUrl
) {}
