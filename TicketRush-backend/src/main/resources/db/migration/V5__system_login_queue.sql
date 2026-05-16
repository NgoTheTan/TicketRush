-- ============================================================
-- V5: System Login Queue
-- Queue xuất hiện ngay sau khi đăng nhập (system-level, không gắn event).
-- Thay đổi: event_id trong queue_sessions trở thành nullable.
-- ============================================================

-- Cho phép event_id = NULL (system queue không gắn với event cụ thể)
ALTER TABLE queue_sessions
    ALTER COLUMN event_id DROP NOT NULL;

-- Drop FK constraint cũ nếu có (để NULL được chấp nhận)
ALTER TABLE queue_sessions
    DROP CONSTRAINT IF EXISTS fk_queue_event;

-- Tạo lại FK với nullable (DEFERRABLE để tránh conflict)
ALTER TABLE queue_sessions
    ADD CONSTRAINT fk_queue_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED;

-- Index cho system queue (event_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_queue_system_status_pos
    ON queue_sessions (status, position ASC)
    WHERE event_id IS NULL;

SELECT 'V5 migration: system login queue ready' AS message;
