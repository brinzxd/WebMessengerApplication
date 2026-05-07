CREATE TABLE conversations (
    id              BIGINT   NOT NULL AUTO_INCREMENT,
    user1_id        BIGINT   NOT NULL,
    user2_id        BIGINT   NOT NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_message_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_conversation (user1_id, user2_id),
    CONSTRAINT fk_conv_u1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_u2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
