CREATE TABLE users (
    id         BIGINT          NOT NULL AUTO_INCREMENT,
    nickname   VARCHAR(30)     NOT NULL,
    email      VARCHAR(100)    NOT NULL,
    password   VARCHAR(255)    NOT NULL,
    avatar_url VARCHAR(512)    NULL,
    last_seen_at DATETIME      NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_nickname (nickname),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
