CREATE TABLE message_hidden (
    id         BIGINT   NOT NULL AUTO_INCREMENT,
    message_id BIGINT   NOT NULL,
    user_id    BIGINT   NOT NULL,
    hidden_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_message_hidden (message_id, user_id),
    CONSTRAINT fk_mh_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_mh_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
