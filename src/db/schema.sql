CREATE TABLE IF NOT EXISTS devices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  device      VARCHAR(50)          NOT NULL,
  room        VARCHAR(30)          NOT NULL,
  status      ENUM('on', 'off')    NOT NULL DEFAULT 'off',
  description VARCHAR(255)         NOT NULL DEFAULT '',
  image       VARCHAR(500)                  DEFAULT NULL,
  createdAt   DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS migrations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  schema_hash VARCHAR(32)  NOT NULL,
  applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);