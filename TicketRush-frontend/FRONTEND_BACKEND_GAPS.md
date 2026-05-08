# FRONTEND_BACKEND_GAPS.md
# TicketRush — Frontend ↔ Backend Integration Status

> Cập nhật: Sprint 3 backend complete  
> Sprint 4 (Dashboard Analytics) CHƯA được implement ở backend.

---

## ✅ Sprint 1 + 2 — Đã tích hợp API thật

| Màn hình | API | Ghi chú |
|---|---|---|
| SignIn | `POST /api/v1/auth/login` | JWT localStorage |
| SignUp | `POST /api/v1/auth/register` | User + CustomerProfile |
| Homepage | `GET /api/v1/events` | Pagination, search |
| EventDetails | `GET /api/v1/events/{id}` | Zones + seat summary |
| SeatSelection | `GET/POST/DELETE /api/v1/events/{id}/seats/...` | Hold với SELECT FOR UPDATE |
| OrderConfirmation | `POST /api/v1/orders` + `POST /api/v1/checkout/{holdId}/confirm` | 2-step checkout |
| BookingSuccess | State từ checkout response | — |
| MyTickets | `GET /api/v1/tickets/my` | ✅ Đúng endpoint |
| TicketDetails | `GET /api/v1/tickets/{id}` | QR từ ticketCode UUID |
| Admin EventManagement | `GET /api/v1/admin/events` + `PATCH .../status` | — |
| Admin CreateEvent | `POST /api/v1/admin/events` | — |
| Admin SeatLayoutConfig | `GET/POST /api/v1/admin/events/{id}/seat-zones` | — |
| Admin OrderManagement | `GET /api/v1/admin/orders` | — |

---

## ✅ Sprint 3 — Đã implement backend, cần tích hợp frontend

### WebSocket Seat Updates
- **Backend:** Spring WebSocket STOMP tại `/ws`
- **Topics:** `/topic/seats/{eventId}` → payload `{ type, eventId, seatId, status, timestamp }`
- **Events:** `SEAT_LOCKED`, `SEAT_AVAILABLE`, `SEAT_SOLD`
- **Frontend cần làm:** Kết nối STOMP trong `SeatSelectionPage` để nhận updates realtime
  ```js
  // TODO: Connect via @stomp/stompjs
  // stompClient.subscribe('/topic/seats/' + eventId, (msg) => {
  //   const update = JSON.parse(msg.body);
  //   // update local seat map state: update.seatId → update.status
  // });
  ```

### Scheduler Auto-release
- **Backend:** `SeatReleaseScheduler` chạy mỗi 30s — BR-04 hoàn toàn đúng
- **Frontend:** Không cần thay đổi — UI countdown đã xử lý đúng

### Virtual Queue
- **Backend APIs đã có:**
  - `GET /api/v1/queue/{eventId}/status` — PUBLIC
  - `POST /api/v1/queue/{eventId}/join` — CUSTOMER
  - `GET /api/v1/queue/position/{token}` — CUSTOMER (polling 3s)
  - `PATCH /api/v1/admin/events/{eventId}/queue?active=true|false` — ADMIN
- **Frontend:** `VirtualWaitingRoomPage` đã dùng `queueService` — đã update sang real API
- **`VITE_ENABLE_MOCK_QUEUE` đã set = false**

---

## 🟡 Sprint 4 — Backend chưa implement

### AdminDashboard Analytics
- **Mock mode:** `VITE_ENABLE_MOCK_DASHBOARD=true`
- **Endpoint dự kiến:**
  - `GET /api/v1/admin/dashboard/{eventId}` → revenue, fillRate, revenueByHour, audienceByAge, audienceByGender, recentOrders

---

## 📋 Frontend việc cần làm sau Sprint 3

1. **WebSocket client** trong `SeatSelectionPage`:
   - Cài `@stomp/stompjs` và `sockjs-client`
   - Subscribe `/topic/seats/{eventId}`
   - Cập nhật seat status realtime từ WS message

2. **EventDetails** — check queue status:
   - Trước khi navigate sang SeatSelection, gọi `queueService.getQueueStatus(eventId)`
   - Nếu `queueActive = true` → navigate sang VirtualWaitingRoom
   - Nếu `queueActive = false` → navigate thẳng vào SeatSelection

3. **Admin queue toggle** — trong EventManagement:
   - Thêm nút "Bật/Tắt hàng chờ" gọi `PATCH /api/v1/admin/events/{id}/queue?active=true|false`
