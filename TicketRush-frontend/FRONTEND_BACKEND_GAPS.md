# FRONTEND_BACKEND_GAPS.md
# TicketRush — Frontend ↔ Backend Integration Status

> **Trạng thái: HOÀN CHỈNH** — Tất cả gap đã được bổ sung.

---

## ✅ Tất cả tính năng đã hoàn chỉnh

| Tính năng | Backend | Frontend | Sprint |
|---|---|---|---|
| Auth (login, register) | ✅ | ✅ | 1 |
| **Profile update + đổi mật khẩu** | ✅ `PUT /api/v1/auth/me` | ✅ `/profile` | **Gap** |
| Homepage / Event list | ✅ | ✅ | 1 |
| Event Detail | ✅ | ✅ | 1 |
| Seat map + Hold/Release | ✅ SELECT FOR UPDATE | ✅ | 2 |
| **WebSocket seat realtime** | ✅ STOMP `/topic/seats/{id}` | ✅ `useWebSocket.js` | **Gap** |
| Checkout (order + confirm) | ✅ | ✅ | 2 |
| Booking Success | ✅ | ✅ | 2 |
| My Tickets + QR | ✅ | ✅ | 2 |
| Virtual Waiting Room | ✅ Queue API | ✅ | 3 |
| Scheduler auto-release | ✅ 30s | — | 3 |
| Admin Dashboard analytics | ✅ | ✅ | 4 |
| Admin Event Management | ✅ | ✅ | 1 |
| Admin Seat Layout Config | ✅ | ✅ | 1 |
| **Admin Order Management + Detail** | ✅ | ✅ Modal popup | **Gap** |

---

## 📦 Cài đặt sau khi clone

```bash
# Frontend — cần cài WebSocket packages
cd TicketRush-frontend
npm install

# Backend — không cần thêm package
cd TicketRush-backend
./mvnw spring-boot:run
```

---

## ⚠️ Còn có thể làm thêm (không bắt buộc)

- Admin queue toggle UI trong EventManagement (backend đã có endpoint)
- Email notification sau khi đặt vé thành công
- Check-in QR scan endpoint (`Ticket.status` → USED)
