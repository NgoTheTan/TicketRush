# FRONTEND_BACKEND_GAPS.md
# TicketRush — Frontend ↔ Backend Integration Status

> Cập nhật: Sprint 2 backend complete + Frontend implementation  
> Sprint 3 (WebSocket, Scheduler, Queue) và Sprint 4 (Dashboard Analytics) CHƯA được implement ở backend.

---

## ✅ Màn hình đã tích hợp API thật (100% real)

| Màn hình | API sử dụng | Ghi chú |
|---|---|---|
| **SignIn** | `POST /api/v1/auth/login` | Lưu JWT vào localStorage |
| **SignUp** | `POST /api/v1/auth/register` | Tạo User + CustomerProfile |
| **Homepage** | `GET /api/v1/events` | Pagination, search |
| **EventDetails** | `GET /api/v1/events/{id}` | Zones + seat summary |
| **SeatSelection** | `GET /api/v1/events/{id}/seats` `POST .../hold` `DELETE .../hold` | Hold với SELECT FOR UPDATE |
| **OrderConfirmation** | `POST /api/v1/orders` `POST /api/v1/checkout/{holdId}/confirm` | 2-step checkout |
| **BookingSuccess** | State từ checkout response | Không cần API riêng |
| **MyTickets** | `GET /api/v1/tickets/my` | ✅ Dùng đúng endpoint |
| **TicketDetails** | `GET /api/v1/tickets/{id}` | QR render từ ticketCode UUID |
| **Admin - EventManagement** | `GET /api/v1/admin/events` `PATCH .../status` | List + status change |
| **Admin - CreateEvent** | `POST /api/v1/admin/events` | Redirect về seat config |
| **Admin - SeatLayoutConfig** | `GET/POST /api/v1/admin/events/{id}/seat-zones` | Sinh ghế tự động |
| **Admin - OrderManagement** | `GET /api/v1/admin/orders` | Filter by status/search |

---

## 🟡 Màn hình dùng MOCK (chờ backend Sprint 3/4)

### VirtualWaitingRoom
- **Mock mode:** `VITE_ENABLE_MOCK_QUEUE=true`
- **Endpoint dự kiến (Sprint 3):**
  - `POST /api/v1/queue/{eventId}/join` → `{ sessionId, queueToken, position, estimatedWaitSeconds }`
  - `GET /api/v1/queue/position/{token}` → `{ status, position, estimatedWaitSeconds }` (polling mỗi 3s)
  - `GET /api/v1/queue/{eventId}/status` → `{ queueActive: boolean }`
- **Frontend service:** `src/api/services.js::queueService`

### AdminDashboard — Analytics section
- **Mock mode:** `VITE_ENABLE_MOCK_DASHBOARD=true`
- **Endpoint dự kiến (Sprint 4):**
  - `GET /api/v1/admin/dashboard/{eventId}` → Revenue, fillRate, revenueByHour, audienceByAge, audienceByGender, recentOrders
- **Frontend service:** Cần tạo `dashboardService.js` khi Sprint 4 có backend

---

## ⚠️ Backend endpoints còn thiếu (cần bổ sung)

### 1. WebSocket seat updates (Sprint 3)
- **Cần thêm:** Spring WebSocket STOMP config
- **Topic:** `/topic/seats/{eventId}`
- **Payload:** `{ type: 'SEAT_LOCKED' | 'SEAT_AVAILABLE' | 'SEAT_SOLD', seatId, status }`
- **Frontend:** Khi backend có, thêm vào `SeatSelectionPage`:
  ```js
  // TODO Sprint 3: Subscribe to /topic/seats/{eventId}
  // Update seat status realtime without full reload
  ```

### 2. Scheduler auto-release (Sprint 3)
- Backend cần `@Scheduled` job release `EventSeat` hết hạn `held_until`
- Frontend hiện xử lý UI-only khi countdown = 0 (reload seat map)

### 3. Dashboard analytics (Sprint 4)
- `GET /api/v1/admin/dashboard/{eventId}` chưa có
- Frontend đang dùng mock cho revenue, fillRate, audience charts

### 4. Ticket detail endpoint (hiện có)
- `GET /api/v1/tickets/{ticketId}` đã có — frontend đang gọi thật

### 5. Profile update (chưa có)
- Frontend hiện chỉ đọc profile từ `/api/v1/auth/me`
- Endpoint update profile `PUT /api/v1/profile` chưa được implement

---

## 📋 DTO frontend mong muốn (cho reference khi implement Sprint 3/4)

### QueueJoinResponse
```json
{
  "sessionId": 500,
  "queueToken": "uuid",
  "position": 284,
  "estimatedWaitSeconds": 360
}
```

### QueuePositionResponse
```json
{
  "status": "WAITING | ADMITTED | CANCELLED | EXPIRED",
  "position": 45,
  "estimatedWaitSeconds": 54,
  "accessToken": "jwt-string (khi ADMITTED)",
  "accessExpiresAt": "ISO-8601 (khi ADMITTED)"
}
```

### DashboardMetricsResponse
```json
{
  "eventId": 1,
  "summary": {
    "totalSeats": 500, "soldSeats": 266,
    "fillRate": 53.2, "totalRevenue": 279500000
  },
  "revenueByHour": [{ "hour": "ISO", "revenue": 0, "ticketsSold": 0 }],
  "audienceByAge": [{ "ageGroup": "18-24", "count": 85, "percentage": 31.9 }],
  "audienceByGender": [{ "gender": "MALE", "count": 148, "percentage": 55.6 }],
  "recentOrders": []
}
```
