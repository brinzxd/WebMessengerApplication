CREATE TABLE friendships (
    id          BIGINT   NOT NULL AUTO_INCREMENT,
    user1_id    BIGINT   NOT NULL,
    user2_id    BIGINT   NOT NULL,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_friendship (user1_id, user2_id),
    CONSTRAINT fk_fs_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
