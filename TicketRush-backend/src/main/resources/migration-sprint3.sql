-- ============================================================
-- TicketRush — Sprint 3 Migration
-- File: TicketRush-backend/src/main/resources/migration-sprint3.sql
--
-- Chạy trước khi khởi động app sau khi update code Sprint 3:
--   psql -U postgres -d ems -f migration-sprint3.sql
--
-- Nếu dùng ddl-auto=update thì Hibernate sẽ tự tạo (trừ queue_sessions
-- cần VARCHAR status thay vì ENUM — Hibernate sẽ tạo đúng).
-- ============================================================

-- 1. Thêm cột queue_active vào bảng events (nếu chưa có)
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS queue_active BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tạo bảng queue_sessions
CREATE TABLE IF NOT EXISTS queue_sessions (
    id                 BIGSERIAL       PRIMARY KEY,
    user_id            BIGINT          NOT NULL REFERENCES users(id),
    event_id           BIGINT          NOT NULL REFERENCES events(id),
    queue_token        UUID            NOT NULL DEFAULT gen_random_uuid(),
    position           INT             NOT NULL CHECK (position > 0),
    status             VARCHAR(20)     NOT NULL DEFAULT 'WAITING',
    joined_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    admitted_at        TIMESTAMP,
    access_expires_at  TIMESTAMP,

    CONSTRAINT uq_queue_token UNIQUE (queue_token),
    CONSTRAINT chk_queue_status CHECK (status IN ('WAITING', 'ADMITTED', 'CANCELLED', 'EXPIRED'))
);

-- 3. Indexes cho queue_sessions
CREATE INDEX IF NOT EXISTS idx_queue_event_status_pos
    ON queue_sessions (event_id, status, position);

CREATE INDEX IF NOT EXISTS idx_queue_token
    ON queue_sessions (queue_token);

CREATE INDEX IF NOT EXISTS idx_queue_admitted_exp
    ON queue_sessions (status, access_expires_at)
    WHERE status = 'ADMITTED';

-- 4. Xác nhận
SELECT 'Migration Sprint 3 hoàn thành!' AS message;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'queue_sessions'
ORDER BY ordinal_position;
