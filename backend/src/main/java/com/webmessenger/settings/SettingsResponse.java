package com.webmessenger.settings;

public record SettingsResponse(
    String whoCanMessage,
    String onlineVisibility
) {}
