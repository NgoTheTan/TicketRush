-- ============================================================
-- TicketRush Sprint 3 migration
-- Adds the queue toggle on events and the virtual waiting room
-- ============================================================

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS queue_active BOOLEAN NOT NULL DEFAULT FALSE;

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

CREATE INDEX IF NOT EXISTS idx_queue_event_status_pos
    ON queue_sessions (event_id, status, position);

CREATE INDEX IF NOT EXISTS idx_queue_token
    ON queue_sessions (queue_token);

CREATE INDEX IF NOT EXISTS idx_queue_admitted_exp
    ON queue_sessions (status, access_expires_at)
    WHERE status = 'ADMITTED';