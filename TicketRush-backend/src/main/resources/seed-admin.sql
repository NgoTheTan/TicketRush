-- ============================================================
-- TicketRush — Seed Admin Account
-- File: TicketRush-backend/src/main/resources/seed-admin.sql
--
-- Cách chạy:
--   psql -U postgres -d ems -f seed-admin.sql
--   Hoặc mở file trong DBeaver / pgAdmin rồi Execute
--
-- Tài khoản tạo ra:
--   Email   : admin@ticketrush.io
--   Password: Admin@123456
--   Role    : ADMIN
-- ============================================================

-- Tránh lỗi nếu email đã tồn tại
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@ticketrush.io',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewc.5pT3t0Lhm6Vu',
    'TicketRush Admin',
    'ADMIN'
)
ON CONFLICT (email) DO NOTHING;

-- Xác nhận kết quả
SELECT id, email, full_name, role, created_at
FROM users
WHERE role = 'ADMIN';
