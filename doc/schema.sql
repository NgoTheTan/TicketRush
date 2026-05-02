-- ============================================================
-- TicketRush — PostgreSQL Database Schema
-- Version: 1.0
-- Database: PostgreSQL 16+
-- Encoding: UTF-8
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- full-text search with Vietnamese

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role      AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE gender_type    AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE event_status   AS ENUM ('UPCOMING', 'ON_SALE', 'ENDED', 'CANCELLED');
CREATE TYPE seat_status    AS ENUM ('AVAILABLE', 'LOCKED', 'SOLD');
CREATE TYPE hold_status    AS ENUM ('ACTIVE', 'EXPIRED', 'RELEASED', 'CONVERTED');
CREATE TYPE order_status   AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');
CREATE TYPE ticket_status  AS ENUM ('VALID', 'USED', 'CANCELLED');
CREATE TYPE queue_status   AS ENUM ('WAITING', 'ADMITTED', 'CANCELLED', 'EXPIRED');

-- ============================================================
-- TABLE: users
-- Identity & Authentication
-- ============================================================
CREATE TABLE users (
    id          BIGSERIAL       PRIMARY KEY,
    email       VARCHAR(255)    NOT NULL,
    password    VARCHAR(255)    NOT NULL,           -- BCrypt hash
    full_name   VARCHAR(255)    NOT NULL,
    role        user_role       NOT NULL DEFAULT 'CUSTOMER',
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_role ON users (role);

COMMENT ON TABLE  users              IS 'Core identity table. Both CUSTOMER and ADMIN share this table, distinguished by role.';
COMMENT ON COLUMN users.password     IS 'BCrypt-hashed password. Never store plain text.';
COMMENT ON COLUMN users.role         IS 'CUSTOMER: ticket buyers. ADMIN: organizers with full system access.';

-- ============================================================
-- TABLE: customer_profiles
-- Extended customer info required for analytics
-- ============================================================
CREATE TABLE customer_profiles (
    id            BIGSERIAL     PRIMARY KEY,
    user_id       BIGINT        NOT NULL,
    phone         VARCHAR(20)   NOT NULL,
    date_of_birth DATE          NOT NULL,          -- Required for age analytics
    gender        gender_type   NOT NULL,           -- Required for gender analytics
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_profile_user     FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_profile_user_id  UNIQUE (user_id)
);

CREATE INDEX idx_profile_dob    ON customer_profiles (date_of_birth);
CREATE INDEX idx_profile_gender ON customer_profiles (gender);

COMMENT ON TABLE  customer_profiles               IS 'Extended profile for CUSTOMER role. Stores demographic data required by AdminDashboard analytics (age groups, gender distribution).';
COMMENT ON COLUMN customer_profiles.date_of_birth IS 'Mandatory per BR-09. Used to compute age-group analytics on AdminDashboard.';
COMMENT ON COLUMN customer_profiles.gender        IS 'Mandatory per BR-09. Used to compute gender-distribution analytics on AdminDashboard.';

-- ============================================================
-- TABLE: events
-- Core event catalog
-- ============================================================
CREATE TABLE events (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(500)    NOT NULL,
    description TEXT,
    venue       VARCHAR(500)    NOT NULL,
    event_date  TIMESTAMP       NOT NULL,
    image_url   VARCHAR(1000),
    status      event_status    NOT NULL DEFAULT 'UPCOMING',
    created_by  BIGINT          NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_event_creator FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE INDEX idx_events_status     ON events (status);
CREATE INDEX idx_events_event_date ON events (event_date);
CREATE INDEX idx_events_created_by ON events (created_by);

COMMENT ON TABLE  events        IS 'Single-organizer event catalog. Only ADMIN can create/modify events.';
COMMENT ON COLUMN events.status IS 'Valid transitions: UPCOMING→ON_SALE, ON_SALE→ENDED, UPCOMING/ON_SALE→CANCELLED.';

-- ============================================================
-- TABLE: seat_zones
-- Zone configuration per event (VIP, Standard, etc.)
-- ============================================================
CREATE TABLE seat_zones (
    id            BIGSERIAL       PRIMARY KEY,
    event_id      BIGINT          NOT NULL,
    name          VARCHAR(100)    NOT NULL,
    price         DECIMAL(15,2)   NOT NULL,         -- Price applies to all seats in this zone
    total_rows    INT             NOT NULL,
    seats_per_row INT             NOT NULL,
    color_code    VARCHAR(7),                        -- Hex color for seat map UI
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_zone_event   FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT chk_zone_price  CHECK (price > 0),
    CONSTRAINT chk_zone_rows   CHECK (total_rows > 0),
    CONSTRAINT chk_zone_spr    CHECK (seats_per_row > 0)
);

CREATE INDEX idx_seat_zones_event ON seat_zones (event_id);

COMMENT ON TABLE  seat_zones       IS 'Defines seating zones for an event. Price is set per zone, not per individual seat (BR-11).';
COMMENT ON COLUMN seat_zones.price IS 'Zone-level pricing. All seats in this zone share the same price.';

-- ============================================================
-- TABLE: event_seats
-- Individual seat inventory per event — core trading unit
-- ============================================================
CREATE TABLE event_seats (
    id            BIGSERIAL       PRIMARY KEY,
    event_id      BIGINT          NOT NULL,
    zone_id       BIGINT          NOT NULL,
    row_label     VARCHAR(10)     NOT NULL,          -- e.g. 'A', 'B', 'AA'
    seat_number   INT             NOT NULL,           -- e.g. 1, 2, 3
    status        seat_status     NOT NULL DEFAULT 'AVAILABLE',
    held_by       BIGINT,                             -- FK to users.id (nullable)
    held_until    TIMESTAMP,                          -- Hold expiry time (nullable)
    price_at_sale DECIMAL(15,2),                     -- Snapshot of zone.price at time of sale
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_seat_event    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_zone     FOREIGN KEY (zone_id)  REFERENCES seat_zones (id),
    CONSTRAINT fk_seat_holder   FOREIGN KEY (held_by)  REFERENCES users (id),

    -- Prevents duplicate seat coordinates within the same event
    CONSTRAINT uq_event_seat    UNIQUE (event_id, zone_id, row_label, seat_number)
);

-- Critical for seat map load performance
CREATE INDEX idx_seats_event_status  ON event_seats (event_id, status);
-- Scheduler uses this to find expired locks
CREATE INDEX idx_seats_held_until    ON event_seats (held_until) WHERE status = 'LOCKED';
-- Find all seats held by a specific user in an event
CREATE INDEX idx_seats_held_by       ON event_seats (held_by) WHERE held_by IS NOT NULL;

COMMENT ON TABLE  event_seats             IS 'Individual seat inventory. Each row = one physical seat. The fundamental unit of sale in TicketRush.';
COMMENT ON COLUMN event_seats.status      IS 'AVAILABLE: open for selection. LOCKED: held by a user for up to 10 min. SOLD: purchased, terminal state.';
COMMENT ON COLUMN event_seats.held_by     IS 'User currently holding this seat. NULL when AVAILABLE or SOLD.';
COMMENT ON COLUMN event_seats.held_until  IS 'Hold expires at this timestamp. Scheduler releases LOCKED seats past this time.';
COMMENT ON COLUMN event_seats.price_at_sale IS 'Snapshot of zone price at time of purchase. Immutable after SOLD to preserve billing history.';

-- ============================================================
-- TABLE: seat_holds
-- Hold session audit trail (parent record)
-- ============================================================
CREATE TABLE seat_holds (
    id            BIGSERIAL     PRIMARY KEY,
    user_id       BIGINT        NOT NULL,
    event_id      BIGINT        NOT NULL,
    status        hold_status   NOT NULL DEFAULT 'ACTIVE',
    held_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMP     NOT NULL,              -- held_at + 10 minutes
    released_at   TIMESTAMP,                           -- Set on RELEASED or EXPIRED
    converted_at  TIMESTAMP,                           -- Set on CONVERTED (checkout success)
    order_id      BIGINT,                              -- FK set when CONVERTED

    CONSTRAINT fk_hold_user     FOREIGN KEY (user_id)  REFERENCES users (id),
    CONSTRAINT fk_hold_event    FOREIGN KEY (event_id) REFERENCES events (id),
    CONSTRAINT chk_hold_expiry  CHECK (expires_at > held_at)
);

-- Scheduler: find all ACTIVE holds past expiry
CREATE INDEX idx_holds_expires      ON seat_holds (expires_at, status) WHERE status = 'ACTIVE';
-- Service: find active hold for a user+event combo
CREATE INDEX idx_holds_user_event   ON seat_holds (user_id, event_id, status);

COMMENT ON TABLE  seat_holds             IS 'Parent record for a hold session. One session can hold 1–2 seats (BR-10). Provides audit trail beyond EventSeat.status.';
COMMENT ON COLUMN seat_holds.expires_at  IS 'Always held_at + 10 minutes. Must match EventSeat.held_until for all child seats.';
COMMENT ON COLUMN seat_holds.order_id    IS 'Populated when status transitions to CONVERTED after successful checkout.';

-- ============================================================
-- TABLE: seat_hold_items
-- Individual seats within a hold session (max 2 per BR-10)
-- ============================================================
CREATE TABLE seat_hold_items (
    id              BIGSERIAL       PRIMARY KEY,
    hold_id         BIGINT          NOT NULL,
    seat_id         BIGINT          NOT NULL,
    price_snapshot  DECIMAL(15,2)   NOT NULL,    -- Zone price at time of hold

    CONSTRAINT fk_hold_item_hold    FOREIGN KEY (hold_id) REFERENCES seat_holds (id) ON DELETE CASCADE,
    CONSTRAINT fk_hold_item_seat    FOREIGN KEY (seat_id) REFERENCES event_seats (id),
    -- Each seat can only appear once per hold session
    CONSTRAINT uq_hold_item_seat    UNIQUE (hold_id, seat_id)
);

CREATE INDEX idx_hold_items_hold ON seat_hold_items (hold_id);
CREATE INDEX idx_hold_items_seat ON seat_hold_items (seat_id);

COMMENT ON TABLE  seat_hold_items                IS 'Junction table linking a hold session to specific seats. Max 2 rows per hold_id enforced at application layer.';
COMMENT ON COLUMN seat_hold_items.price_snapshot IS 'Zone price captured at hold time. Used as source of truth for order total calculation.';

-- ============================================================
-- TABLE: orders
-- Order lifecycle (checkout session)
-- ============================================================
CREATE TABLE orders (
    id            BIGSERIAL       PRIMARY KEY,
    order_code    VARCHAR(50)     NOT NULL,          -- Human-readable: TKR-20260501-0001
    user_id       BIGINT          NOT NULL,
    event_id      BIGINT          NOT NULL,
    hold_id       BIGINT          NOT NULL,
    status        order_status    NOT NULL DEFAULT 'PENDING',
    total_amount  DECIMAL(15,2)   NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    paid_at       TIMESTAMP,                         -- Set when status → PAID
    expires_at    TIMESTAMP       NOT NULL,          -- Mirrors SeatHold.expires_at

    CONSTRAINT fk_order_user    FOREIGN KEY (user_id)  REFERENCES users (id),
    CONSTRAINT fk_order_event   FOREIGN KEY (event_id) REFERENCES events (id),
    CONSTRAINT fk_order_hold    FOREIGN KEY (hold_id)  REFERENCES seat_holds (id),
    CONSTRAINT uq_order_code    UNIQUE (order_code),
    CONSTRAINT chk_order_amount CHECK (total_amount >= 0)
);

CREATE INDEX idx_orders_user_status   ON orders (user_id, status);
CREATE INDEX idx_orders_event_status  ON orders (event_id, status);
-- Scheduler: find PENDING orders past expiry
CREATE INDEX idx_orders_pending_exp   ON orders (status, expires_at) WHERE status = 'PENDING';

COMMENT ON TABLE  orders              IS 'Checkout session record. Created when customer proceeds from seat selection. PAID = revenue confirmed.';
COMMENT ON COLUMN orders.order_code   IS 'Human-readable unique code shown to customer. Format: TKR-YYYYMMDD-NNNN.';
COMMENT ON COLUMN orders.total_amount IS 'Sum of all order_items.unit_price. Only PAID orders count toward dashboard revenue (BR-07).';
COMMENT ON COLUMN orders.expires_at   IS 'Must equal hold.expires_at. Order cannot be confirmed after this time (BR-05).';

-- ============================================================
-- TABLE: order_items
-- Line items for each seat in an order
-- ============================================================
CREATE TABLE order_items (
    id          BIGSERIAL       PRIMARY KEY,
    order_id    BIGINT          NOT NULL,
    seat_id     BIGINT          NOT NULL,
    zone_name   VARCHAR(100)    NOT NULL,     -- Snapshot: zone name at sale time
    row_label   VARCHAR(10)     NOT NULL,     -- Snapshot: row label at sale time
    seat_number INT             NOT NULL,     -- Snapshot: seat number at sale time
    unit_price  DECIMAL(15,2)   NOT NULL,     -- Snapshot: price at sale time

    CONSTRAINT fk_item_order    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_item_seat     FOREIGN KEY (seat_id)  REFERENCES event_seats (id),
    -- CRITICAL: one seat can only ever be sold once across all orders
    CONSTRAINT uq_item_seat_id  UNIQUE (seat_id)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

COMMENT ON TABLE  order_items           IS 'Line item for each seat in a PAID order. Snapshot columns ensure billing history is immutable even if zone/seat data changes.';
COMMENT ON COLUMN order_items.seat_id   IS 'UNIQUE constraint is the DB-level safeguard against double-selling a seat.';
COMMENT ON COLUMN order_items.zone_name IS 'Snapshot of seat_zones.name at sale time. Preserved independently of future zone renames.';

-- ============================================================
-- TABLE: tickets
-- Electronic tickets issued after successful checkout
-- ============================================================
CREATE TABLE tickets (
    id              BIGSERIAL       PRIMARY KEY,
    ticket_code     UUID            NOT NULL DEFAULT gen_random_uuid(),  -- QR code data
    order_item_id   BIGINT          NOT NULL,
    user_id         BIGINT          NOT NULL,    -- Denormalized for fast "my tickets" queries
    event_id        BIGINT          NOT NULL,    -- Denormalized for admin queries
    seat_id         BIGINT          NOT NULL,    -- Denormalized for direct seat lookup
    status          ticket_status   NOT NULL DEFAULT 'VALID',
    issued_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMP,                   -- Future: set on check-in scan

    CONSTRAINT fk_ticket_order_item FOREIGN KEY (order_item_id) REFERENCES order_items (id),
    CONSTRAINT fk_ticket_user       FOREIGN KEY (user_id)       REFERENCES users (id),
    CONSTRAINT fk_ticket_event      FOREIGN KEY (event_id)      REFERENCES events (id),
    CONSTRAINT fk_ticket_seat       FOREIGN KEY (seat_id)       REFERENCES event_seats (id),
    -- ticket_code must be globally unique (it IS the QR content)
    CONSTRAINT uq_ticket_code       UNIQUE (ticket_code),
    -- One ticket per order item
    CONSTRAINT uq_ticket_order_item UNIQUE (order_item_id),
    -- One ticket per seat (at any point in time)
    CONSTRAINT uq_ticket_seat       UNIQUE (seat_id)
);

CREATE INDEX idx_tickets_user_status  ON tickets (user_id, status);
CREATE INDEX idx_tickets_event        ON tickets (event_id);

COMMENT ON TABLE  tickets              IS 'Electronic ticket issued per seat after Order → PAID. ticket_code (UUID) is the QR code payload rendered by qrcode.react on the frontend.';
COMMENT ON COLUMN tickets.ticket_code  IS 'UUID encoded as QR. Frontend renders this via qrcode.react. Not a random image — uniquely identifies this ticket (see data-model.md).';
COMMENT ON COLUMN tickets.user_id      IS 'Denormalized from order_items → orders. Enables O(1) "GET /tickets/my" without joins.';

-- ============================================================
-- TABLE: queue_sessions
-- Virtual waiting room sessions
-- ============================================================
CREATE TABLE queue_sessions (
    id                 BIGSERIAL     PRIMARY KEY,
    user_id            BIGINT        NOT NULL,
    event_id           BIGINT        NOT NULL,
    queue_token        UUID          NOT NULL DEFAULT gen_random_uuid(),
    position           INT           NOT NULL,
    status             queue_status  NOT NULL DEFAULT 'WAITING',
    joined_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
    admitted_at        TIMESTAMP,               -- Set when WAITING → ADMITTED
    access_expires_at  TIMESTAMP,               -- ADMITTED token TTL (e.g. +15 min)

    CONSTRAINT fk_queue_user    FOREIGN KEY (user_id)  REFERENCES users (id),
    CONSTRAINT fk_queue_event   FOREIGN KEY (event_id) REFERENCES events (id),
    CONSTRAINT uq_queue_token   UNIQUE (queue_token),
    CONSTRAINT chk_queue_pos    CHECK (position > 0)
);

-- Fast polling: token → session lookup
CREATE INDEX idx_queue_token          ON queue_sessions (queue_token);
-- Ordered queue for a given event
CREATE INDEX idx_queue_event_pos      ON queue_sessions (event_id, status, position);
-- Scheduler: find ADMITTED sessions with expired access tokens
CREATE INDEX idx_queue_admitted_exp   ON queue_sessions (status, access_expires_at)
    WHERE status = 'ADMITTED';

COMMENT ON TABLE  queue_sessions                 IS 'Virtual waiting room session. Created when event traffic exceeds threshold. Only users with ADMITTED status may access seat selection.';
COMMENT ON COLUMN queue_sessions.queue_token     IS 'UUID returned to client. Used for polling GET /queue/position/{token}.';
COMMENT ON COLUMN queue_sessions.access_expires_at IS 'After admission, user has this window to select seats. After expiry, token is invalid and user must re-queue.';

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_seats_updated_at
    BEFORE UPDATE ON event_seats
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SEED DATA: Admin account
-- Password: Admin@123456 (BCrypt hash — replace in production)
-- ============================================================
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@ticketrush.io',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewc.5pT3t0Lhm6Vu',
    'TicketRush Admin',
    'ADMIN'
);

-- ============================================================
-- VIEWS: Useful read-only projections
-- ============================================================

-- Event summary for listing page (avoids N+1 seat count queries)
CREATE OR REPLACE VIEW v_event_summary AS
SELECT
    e.id,
    e.name,
    e.venue,
    e.event_date,
    e.image_url,
    e.status,
    e.created_at,
    COUNT(s.id)                                        AS total_seats,
    COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE') AS available_seats,
    COUNT(s.id) FILTER (WHERE s.status = 'LOCKED')    AS locked_seats,
    COUNT(s.id) FILTER (WHERE s.status = 'SOLD')      AS sold_seats,
    MIN(sz.price)                                      AS price_from,
    COALESCE(SUM(s.price_at_sale)
        FILTER (WHERE s.status = 'SOLD'), 0)           AS total_revenue
FROM events e
LEFT JOIN event_seats s  ON s.event_id = e.id
LEFT JOIN seat_zones  sz ON sz.event_id = e.id
GROUP BY e.id;

COMMENT ON VIEW v_event_summary IS 'Aggregated event stats used by homepage listing and admin event management table.';

-- Admin dashboard metrics per event
CREATE OR REPLACE VIEW v_dashboard_metrics AS
SELECT
    e.id                                                AS event_id,
    e.name                                              AS event_name,
    COUNT(s.id)                                         AS total_seats,
    COUNT(s.id) FILTER (WHERE s.status = 'SOLD')        AS sold_seats,
    COUNT(s.id) FILTER (WHERE s.status = 'LOCKED')      AS locked_seats,
    COUNT(s.id) FILTER (WHERE s.status = 'AVAILABLE')   AS available_seats,
    ROUND(
        COUNT(s.id) FILTER (WHERE s.status = 'SOLD')::NUMERIC
        / NULLIF(COUNT(s.id), 0) * 100, 2
    )                                                   AS fill_rate_pct,
    COALESCE(SUM(s.price_at_sale)
        FILTER (WHERE s.status = 'SOLD'), 0)            AS total_revenue
FROM events e
LEFT JOIN event_seats s ON s.event_id = e.id
GROUP BY e.id, e.name;

COMMENT ON VIEW v_dashboard_metrics IS 'Per-event KPIs for AdminDashboard. Revenue counts only SOLD seats (BR-07).';

-- Customer age group analytics
CREATE OR REPLACE VIEW v_audience_age_groups AS
SELECT
    o.event_id,
    CASE
        WHEN DATE_PART('year', AGE(cp.date_of_birth)) BETWEEN 13 AND 17 THEN 'Under 18'
        WHEN DATE_PART('year', AGE(cp.date_of_birth)) BETWEEN 18 AND 24 THEN '18-24'
        WHEN DATE_PART('year', AGE(cp.date_of_birth)) BETWEEN 25 AND 34 THEN '25-34'
        WHEN DATE_PART('year', AGE(cp.date_of_birth)) BETWEEN 35 AND 44 THEN '35-44'
        ELSE '45+'
    END                  AS age_group,
    COUNT(DISTINCT o.user_id) AS customer_count
FROM orders o
JOIN customer_profiles cp ON cp.user_id = o.user_id
WHERE o.status = 'PAID'
GROUP BY o.event_id, age_group;

COMMENT ON VIEW v_audience_age_groups IS 'Age distribution per event. Requires customer_profiles.date_of_birth (BR-09).';

-- Customer gender analytics
CREATE OR REPLACE VIEW v_audience_gender AS
SELECT
    o.event_id,
    cp.gender,
    COUNT(DISTINCT o.user_id) AS customer_count
FROM orders o
JOIN customer_profiles cp ON cp.user_id = o.user_id
WHERE o.status = 'PAID'
GROUP BY o.event_id, cp.gender;

COMMENT ON VIEW v_audience_gender IS 'Gender distribution per event. Requires customer_profiles.gender (BR-09).';

SELECT extname
FROM pg_extension
WHERE extname IN ('pgcrypto', 'unaccent');