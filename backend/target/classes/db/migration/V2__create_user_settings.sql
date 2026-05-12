CREATE TABLE user_settings (
    id                      BIGINT      NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT      NOT NULL,
    who_can_message         VARCHAR(20) NOT NULL DEFAULT 'EVERYONE',
    online_visibility       VARCHAR(20) NOT NULL DEFAULT 'EVERYONE',
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_settings_user (user_id),
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
