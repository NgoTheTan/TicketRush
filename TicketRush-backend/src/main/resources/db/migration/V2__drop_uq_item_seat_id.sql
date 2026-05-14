ALTER TABLE order_items DROP CONSTRAINT IF EXISTS uq_item_seat_id;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS uq_ticket_seat;
