-- ============================================================
-- V4: Virtual Queue Always-On
-- Queue is now always active for ON_SALE events.
-- Adds index to support efficient countByEventIdAndStatusAndPositionLessThan.
-- ============================================================

-- Index for position-based queue sorting (used in batch admit)
CREATE INDEX IF NOT EXISTS idx_queue_sessions_event_status_position
    ON queue_sessions (event_id, status, position ASC);

-- Index for position comparison query (countByEventIdAndStatusAndPositionLessThan)
CREATE INDEX IF NOT EXISTS idx_queue_sessions_position_filter
    ON queue_sessions (event_id, status, position)
    WHERE status = 'WAITING';

-- Ensure events table has queue_active column (may already exist from V1)
ALTER TABLE events ADD COLUMN IF NOT EXISTS queue_active BOOLEAN NOT NULL DEFAULT FALSE;
