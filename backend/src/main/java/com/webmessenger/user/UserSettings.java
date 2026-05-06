package com.webmessenger.user;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserSettings {

    public enum MessagePolicy { EVERYONE, FRIENDS_ONLY }
    public enum PresenceVisibilityPolicy { EVERYONE, FRIENDS_ONLY, NO_ONE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_policy", nullable = false, length = 20)
    private MessagePolicy messagePolicy = MessagePolicy.EVERYONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "presence_visibility_policy", nullable = false, length = 20)
    private PresenceVisibilityPolicy presenceVisibilityPolicy = PresenceVisibilityPolicy.EVERYONE;
}
