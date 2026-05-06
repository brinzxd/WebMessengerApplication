package com.webmessenger.user;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    public enum MessagingPermission { EVERYONE, FRIENDS_ONLY, NO_ONE }
    public enum OnlineVisibility { EVERYONE, FRIENDS_ONLY, NO_ONE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "who_can_message", nullable = false, length = 20)
    private MessagingPermission whoCanMessage = MessagingPermission.EVERYONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "online_visibility", nullable = false, length = 20)
    private OnlineVisibility onlineVisibility = OnlineVisibility.EVERYONE;
}
