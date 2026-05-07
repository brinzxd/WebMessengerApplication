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
    public enum OnlineVisibility    { EVERYONE, FRIENDS_ONLY, NO_ONE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "who_can_message", nullable = false, columnDefinition = "varchar(20)")
    @Builder.Default
    private MessagingPermission whoCanMessage = MessagingPermission.EVERYONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "online_visibility", nullable = false, columnDefinition = "varchar(20)")
    @Builder.Default
    private OnlineVisibility onlineVisibility = OnlineVisibility.EVERYONE;
}
