CREATE TABLE conversations (
    id             BIGINT   NOT NULL AUTO_INCREMENT,
    participant_a  BIGINT   NOT NULL,
    participant_b  BIGINT   NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_conversation (participant_a, participant_b),
    CONSTRAINT fk_conv_a FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_b FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
