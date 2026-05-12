CREATE TABLE messages (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    conversation_id     BIGINT       NOT NULL,
    sender_id           BIGINT       NOT NULL,
    content             TEXT         NOT NULL,
    sent_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_for_all_at  DATETIME(6)  NULL,
    PRIMARY KEY (id),
    KEY idx_messages_conversation (conversation_id),
    KEY idx_messages_sender (sender_id),
    CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender       FOREIGN KEY (sender_id)        REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
