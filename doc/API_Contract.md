# TicketRush — API Contract

> **Phiên bản:** 1.0  
> **Base URL:** `/api/v1`  
> **Auth:** JWT Bearer Token  
> **Content-Type:** `application/json`  
> **Date format:** ISO 8601 — `2026-05-01T14:30:00Z`  
> **Nguồn sự thật:** `user-flows.md` + `data-model.md`

---

## 1. Tổng quan API

### 1.1 Base URL

```
Development:  http://localhost:8080/api/v1
Production:   https://ticketrush.io/api/v1
```

### 1.2 Authentication Strategy

Tất cả authenticated requests phải gửi kèm header:

```http
Authorization: Bearer <jwt_token>
```

JWT payload tối thiểu:
```json
{
  "sub": "42",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "iat": 1746100000,
  "exp": 1746186400
}
```

Token lifetime: **24 giờ**. Không có refresh token trong scope v1.

### 1.3 Role-based Access Control

| Access Level | Mô tả | Yêu cầu |
|---|---|---|
| `PUBLIC` | Không cần token | Không cần header |
| `CUSTOMER` | Đã đăng nhập, role = CUSTOMER | JWT với role=CUSTOMER |
| `ADMIN` | Đã đăng nhập, role = ADMIN | JWT với role=ADMIN |
| `SYSTEM` | Internal/Scheduler calls | Service-level (không expose ra ngoài) |

### 1.4 Response Format chuẩn

**Thành công:**
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

**Thành công có pagination:**
```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Lỗi:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi đọc được",
    "details": {}
  }
}
```

### 1.5 HTTP Status Codes

| Status | Ý nghĩa |
|---|---|
| `200 OK` | Thành công, có data trả về |
| `201 Created` | Tạo mới thành công |
| `204 No Content` | Thành công, không có data |
| `400 Bad Request` | Request body/params không hợp lệ |
| `401 Unauthorized` | Thiếu hoặc token không hợp lệ |
| `403 Forbidden` | Token hợp lệ nhưng không đủ quyền |
| `404 Not Found` | Resource không tồn tại |
| `409 Conflict` | Conflict state (VD: ghế đã bị giữ) |
| `410 Gone` | Resource đã hết hạn (VD: hold expired) |
| `422 Unprocessable Entity` | Dữ liệu hợp lệ nhưng không xử lý được |
| `500 Internal Server Error` | Lỗi server |

---

## 2. Error Codes chuẩn hóa

### 2.1 Auth Errors (1xxx)

| Code | HTTP | Message |
|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | Token xác thực không được cung cấp |
| `AUTH_TOKEN_INVALID` | 401 | Token không hợp lệ hoặc đã bị giả mạo |
| `AUTH_TOKEN_EXPIRED` | 401 | Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Bạn không có quyền thực hiện thao tác này |
| `AUTH_EMAIL_ALREADY_EXISTS` | 409 | Email này đã được sử dụng |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu không đúng |
| `AUTH_USER_NOT_FOUND` | 404 | Tài khoản không tồn tại |

### 2.2 Event Errors (2xxx)

| Code | HTTP | Message |
|---|---|---|
| `EVENT_NOT_FOUND` | 404 | Sự kiện không tồn tại |
| `EVENT_NOT_ON_SALE` | 422 | Sự kiện này hiện không mở bán |
| `EVENT_INVALID_STATUS_TRANSITION` | 422 | Không thể chuyển trạng thái sự kiện theo cách này |
| `EVENT_HAS_ACTIVE_SEATS` | 422 | Không thể thay đổi cấu hình khi đang có ghế được giữ/bán |

### 2.3 Seat Errors (3xxx)

| Code | HTTP | Message |
|---|---|---|
| `SEAT_NOT_FOUND` | 404 | Ghế không tồn tại |
| `SEAT_NOT_AVAILABLE` | 409 | Ghế này vừa được người khác giữ, vui lòng chọn ghế khác |
| `SEAT_HOLD_LIMIT_EXCEEDED` | 422 | Bạn chỉ có thể giữ tối đa 2 ghế mỗi lần đặt |
| `SEAT_NOT_OWNED_BY_USER` | 403 | Bạn không phải chủ sở hữu của ghế đang giữ này |
| `SEAT_ZONE_NOT_FOUND` | 404 | Khu vực ghế không tồn tại |
| `SEAT_CONFIG_LOCKED` | 422 | Không thể thay đổi cấu hình ghế khi sự kiện đã mở bán |

### 2.4 Hold Errors (4xxx)

| Code | HTTP | Message |
|---|---|---|
| `HOLD_NOT_FOUND` | 404 | Phiên giữ ghế không tồn tại |
| `HOLD_EXPIRED` | 410 | Thời gian giữ ghế đã hết, vui lòng chọn lại |
| `HOLD_NOT_ACTIVE` | 422 | Phiên giữ ghế không còn hiệu lực |
| `HOLD_NOT_OWNED_BY_USER` | 403 | Bạn không phải chủ sở hữu phiên giữ ghế này |

### 2.5 Order Errors (5xxx)

| Code | HTTP | Message |
|---|---|---|
| `ORDER_NOT_FOUND` | 404 | Đơn hàng không tồn tại |
| `ORDER_ALREADY_PAID` | 409 | Đơn hàng này đã được thanh toán |
| `ORDER_EXPIRED` | 410 | Đơn hàng đã hết hạn |
| `ORDER_ALREADY_CANCELLED` | 409 | Đơn hàng đã bị hủy |
| `ORDER_NOT_OWNED_BY_USER` | 403 | Bạn không có quyền truy cập đơn hàng này |

### 2.6 Ticket Errors (6xxx)

| Code | HTTP | Message |
|---|---|---|
| `TICKET_NOT_FOUND` | 404 | Vé không tồn tại |
| `TICKET_NOT_OWNED_BY_USER` | 403 | Vé này không thuộc về bạn |

### 2.7 Queue Errors (7xxx)

| Code | HTTP | Message |
|---|---|---|
| `QUEUE_SESSION_NOT_FOUND` | 404 | Phiên hàng chờ không tồn tại |
| `QUEUE_TOKEN_INVALID` | 401 | Token hàng chờ không hợp lệ |
| `QUEUE_TOKEN_EXPIRED` | 410 | Token hàng chờ đã hết hạn, vui lòng xếp hàng lại |
| `QUEUE_ALREADY_JOINED` | 409 | Bạn đã có mặt trong hàng chờ của sự kiện này |

### 2.8 Validation Errors (8xxx)

| Code | HTTP | Message |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Dữ liệu không hợp lệ |
| `INVALID_PAGE_PARAMS` | 400 | Tham số phân trang không hợp lệ |

### 2.9 System Errors (9xxx)

| Code | HTTP | Message |
|---|---|---|
| `INTERNAL_SERVER_ERROR` | 500 | Đã có lỗi xảy ra, vui lòng thử lại sau |
| `SERVICE_UNAVAILABLE` | 503 | Hệ thống đang bảo trì |

---

## 3. Endpoint Groups

---

## 3.1 Auth APIs

---

### POST /auth/register

- **Access:** PUBLIC
- **Description:** Đăng ký tài khoản Customer mới. Tạo đồng thời `User` và `CustomerProfile` trong một transaction.

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "StrongPass123!",
  "phone": "0912345678",
  "dateOfBirth": "1998-06-15",
  "gender": "MALE"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `fullName` | string | ✅ | 2–255 ký tự |
| `email` | string | ✅ | Format email hợp lệ, unique |
| `password` | string | ✅ | Tối thiểu 8 ký tự |
| `phone` | string | ✅ | 10–11 số |
| `dateOfBirth` | string (date) | ✅ | ISO date, phải < today, tuổi ≥ 13 |
| `gender` | string | ✅ | Enum: `MALE`, `FEMALE`, `OTHER` |

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 42,
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "CUSTOMER"
    }
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 409 — Email đã tồn tại
{
  "success": false,
  "error": {
    "code": "AUTH_EMAIL_ALREADY_EXISTS",
    "message": "Email này đã được sử dụng",
    "details": { "field": "email" }
  }
}

// 400 — Validation failed
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ",
    "details": {
      "errors": [
        { "field": "password", "message": "Mật khẩu phải có ít nhất 8 ký tự" },
        { "field": "dateOfBirth", "message": "Ngày sinh không hợp lệ" }
      ]
    }
  }
}
```

- **Business rules:** BR-09 (`dateOfBirth` và `gender` bắt buộc cho analytics)
- **Related screen:** `SignUp`

---

### POST /auth/login

- **Access:** PUBLIC
- **Description:** Đăng nhập, trả về JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 42,
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "CUSTOMER"
    }
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 401 — Sai credentials
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không đúng",
    "details": {}
  }
}
```

- **Notes:** Không tiết lộ field nào sai (email hay password) để tránh user enumeration.
- **Related screen:** `SignIn`

---

### POST /auth/logout

- **Access:** CUSTOMER | ADMIN
- **Description:** Đăng xuất. Frontend xóa token khỏi localStorage. Backend có thể implement token blacklist (optional).

**Success Response `204`:** *(No content)*

- **Related screen:** Navbar

---

### GET /auth/me

- **Access:** CUSTOMER | ADMIN
- **Description:** Lấy thông tin user hiện tại từ JWT.

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "profile": {
      "phone": "0912345678",
      "dateOfBirth": "1998-06-15",
      "gender": "MALE"
    }
  },
  "meta": {}
}
```

- **Related screen:** Navbar, Profile page

---

## 3.2 Event APIs (Public / Customer)

---

### GET /events

- **Access:** PUBLIC
- **Description:** Lấy danh sách sự kiện. Mặc định chỉ trả ON_SALE events cho public; Admin có thể xem tất cả qua admin endpoint.

**Query Params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | int | ❌ | `0` | Số trang (0-indexed) |
| `size` | int | ❌ | `12` | Số items mỗi trang (max 50) |
| `search` | string | ❌ | — | Tìm theo tên sự kiện (ILIKE) |
| `status` | string | ❌ | `ON_SALE` | Filter: `ON_SALE`, `UPCOMING`, `ENDED` |
| `sort` | string | ❌ | `eventDate,asc` | Sắp xếp: `eventDate,asc/desc` |

**Success Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Music Festival 2026",
      "venue": "Nhà hát lớn Hà Nội",
      "eventDate": "2026-08-15T19:00:00Z",
      "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg",
      "status": "ON_SALE",
      "priceFrom": 500000,
      "totalSeats": 500,
      "availableSeats": 234
    }
  ],
  "meta": {
    "page": 0,
    "size": 12,
    "totalElements": 8,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

- **Related screen:** `Homepage`

---

### GET /events/{eventId}

- **Access:** PUBLIC
- **Description:** Lấy chi tiết một sự kiện, bao gồm tổng quan các zone ghế.

**Path Params:** `eventId` — ID sự kiện

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Summer Music Festival 2026",
    "description": "Đêm nhạc hoành tráng với sự tham gia của...",
    "venue": "Nhà hát lớn Hà Nội",
    "eventDate": "2026-08-15T19:00:00Z",
    "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg",
    "status": "ON_SALE",
    "createdAt": "2026-05-01T10:00:00Z",
    "zones": [
      {
        "id": 10,
        "name": "Khu A - VIP",
        "price": 1500000,
        "colorCode": "#4F46E5",
        "totalSeats": 100,
        "availableSeats": 42,
        "soldSeats": 58
      },
      {
        "id": 11,
        "name": "Khu B - Standard",
        "price": 800000,
        "colorCode": "#10B981",
        "totalSeats": 400,
        "availableSeats": 192,
        "soldSeats": 208
      }
    ]
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 404
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Sự kiện không tồn tại",
    "details": {}
  }
}
```

- **Related screen:** `EventDetails`

---

## 3.3 Seat APIs

---

### GET /events/{eventId}/seats

- **Access:** CUSTOMER
- **Description:** Lấy toàn bộ ghế của một sự kiện kèm trạng thái hiện tại. Đây là data source cho seat map. **Không trả `held_by` user info** ra ngoài để bảo mật.

**Path Params:** `eventId`

**Query Params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `zoneId` | long | ❌ | Filter theo zone |

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "zones": [
      {
        "zoneId": 10,
        "zoneName": "Khu A - VIP",
        "price": 1500000,
        "colorCode": "#4F46E5",
        "rows": [
          {
            "rowLabel": "A",
            "seats": [
              {
                "seatId": 1001,
                "seatNumber": 1,
                "status": "AVAILABLE"
              },
              {
                "seatId": 1002,
                "seatNumber": 2,
                "status": "LOCKED"
              },
              {
                "seatId": 1003,
                "seatNumber": 3,
                "status": "SOLD"
              }
            ]
          }
        ]
      }
    ]
  },
  "meta": {
    "lastUpdated": "2026-05-01T14:29:55Z"
  }
}
```

- **Notes:** Frontend subscribe thêm WebSocket `/topic/seats/{eventId}` để nhận cập nhật realtime.
- **Related screen:** `SeatSelection`

---

### POST /events/{eventId}/seats/{seatId}/hold

> ⚠️ **ENDPOINT QUAN TRỌNG — Xem đặc tả chi tiết tại Mục 5.1**

- **Access:** CUSTOMER
- **Description:** Giữ một ghế cụ thể. Backend phải thực hiện trong DB transaction với row-level locking.

**Path Params:**
- `eventId` — ID sự kiện
- `seatId` — ID ghế muốn giữ

**Request Body:** *(Không cần body — thông tin lấy từ JWT và path params)*
```json
{}
```

**Xử lý backend (bắt buộc theo thứ tự):**
1. Validate JWT, lấy `userId`
2. Kiểm tra event tồn tại và có status = `ON_SALE`
3. **Mở DB transaction**
4. `SELECT * FROM event_seats WHERE id = :seatId FOR UPDATE` — **row-level lock**
5. Kiểm tra `seat.status == AVAILABLE` → nếu không: trả `SEAT_NOT_AVAILABLE (409)`
6. Đếm số `SeatHoldItem` active của user trong event → nếu ≥ 2: trả `HOLD_LIMIT_EXCEEDED (422)`
7. Tìm hoặc tạo `SeatHold` với status = `ACTIVE` cho user + event này
8. Tạo `SeatHoldItem` (hold_id, seat_id, price_snapshot = zone.price)
9. Update `EventSeat`: `status = LOCKED`, `held_by = userId`, `held_until = NOW() + 10min`
10. Commit transaction
11. **Emit WebSocket event** `seat_locked` tới `/topic/seats/{eventId}`
12. Trả response

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "holdId": 55,
    "expiresAt": "2026-05-01T14:40:00Z",
    "remainingSeconds": 600,
    "heldSeat": {
      "seatId": 1001,
      "zoneName": "Khu A - VIP",
      "rowLabel": "A",
      "seatNumber": 1,
      "price": 1500000
    },
    "allSelectedSeats": [
      {
        "seatId": 1001,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "price": 1500000
      }
    ],
    "totalAmount": 1500000
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 409 — Ghế đã bị giữ
{
  "success": false,
  "error": {
    "code": "SEAT_NOT_AVAILABLE",
    "message": "Ghế này vừa được người khác giữ, vui lòng chọn ghế khác",
    "details": { "seatId": 1001 }
  }
}

// 422 — Vượt giới hạn 2 ghế
{
  "success": false,
  "error": {
    "code": "SEAT_HOLD_LIMIT_EXCEEDED",
    "message": "Bạn chỉ có thể giữ tối đa 2 ghế mỗi lần đặt",
    "details": { "currentHeldCount": 2, "maxAllowed": 2 }
  }
}

// 422 — Event không mở bán
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_ON_SALE",
    "message": "Sự kiện này hiện không mở bán",
    "details": { "eventStatus": "UPCOMING" }
  }
}
```

**WebSocket Event phát ra:**
```json
// Topic: /topic/seats/{eventId}
{
  "type": "SEAT_LOCKED",
  "seatId": 1001,
  "status": "LOCKED"
}
```

- **Business rules:** BR-02, BR-03, BR-04, BR-10
- **Related screen:** `SeatSelection`

---

### DELETE /events/{eventId}/seats/{seatId}/hold

- **Access:** CUSTOMER
- **Description:** Bỏ giữ một ghế (release thủ công). Chỉ được thực hiện bởi user đang giữ ghế đó.

**Path Params:**
- `eventId` — ID sự kiện
- `seatId` — ID ghế muốn release

**Xử lý backend:**
1. Validate JWT, lấy `userId`
2. Kiểm tra `EventSeat.held_by == userId` → nếu không: `SEAT_NOT_OWNED_BY_USER (403)`
3. Xóa `SeatHoldItem` tương ứng
4. Nếu `SeatHold` không còn item nào → cập nhật `SeatHold.status = RELEASED`
5. Update `EventSeat`: `status = AVAILABLE`, `held_by = NULL`, `held_until = NULL`
6. Emit WebSocket `seat_available`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "seatId": 1001,
    "status": "AVAILABLE",
    "remainingSelectedSeats": [],
    "totalAmount": 0
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 403 — Không phải chủ sở hữu
{
  "success": false,
  "error": {
    "code": "SEAT_NOT_OWNED_BY_USER",
    "message": "Bạn không phải chủ sở hữu của ghế đang giữ này",
    "details": {}
  }
}

// 404 — Ghế không ở trạng thái LOCKED
{
  "success": false,
  "error": {
    "code": "SEAT_NOT_FOUND",
    "message": "Ghế không tồn tại hoặc không đang trong trạng thái giữ",
    "details": {}
  }
}
```

**WebSocket Event phát ra:**
```json
{
  "type": "SEAT_AVAILABLE",
  "seatId": 1001,
  "status": "AVAILABLE"
}
```

- **Related screen:** `SeatSelection`

---

## 3.4 Hold APIs

---

### GET /holds/active

- **Access:** CUSTOMER
- **Description:** Lấy thông tin hold đang active của user cho một event. Dùng để khôi phục trạng thái khi user reload trang.

**Query Params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `eventId` | long | ✅ | ID sự kiện |

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "holdId": 55,
    "eventId": 1,
    "status": "ACTIVE",
    "expiresAt": "2026-05-01T14:40:00Z",
    "remainingSeconds": 435,
    "selectedSeats": [
      {
        "seatId": 1001,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "price": 1500000
      },
      {
        "seatId": 1002,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 2,
        "price": 1500000
      }
    ],
    "totalAmount": 3000000
  },
  "meta": {}
}
```

**Khi không có hold active → `200` với `data: null`**

- **Related screen:** `SeatSelection`, `OrderConfirmation`

---

## 3.5 Checkout APIs

---

### POST /orders

- **Access:** CUSTOMER
- **Description:** Tạo Order từ SeatHold hiện tại. Được gọi khi user chuyển từ SeatSelection sang OrderConfirmation.

**Request Body:**
```json
{
  "holdId": 55
}
```

**Xử lý backend:**
1. Validate `SeatHold` thuộc về user + status = `ACTIVE` + `expires_at > NOW()`
2. Tính `totalAmount` từ các SeatHoldItems
3. Tạo `Order` (status = `PENDING`, `expires_at` = SeatHold.expires_at)
4. Tạo `OrderItems` từ SeatHoldItems (với snapshot zone_name, row_label, seat_number, unit_price)

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "orderId": 100,
    "orderCode": "TKR-20260501-0100",
    "status": "PENDING",
    "expiresAt": "2026-05-01T14:40:00Z",
    "remainingSeconds": 380,
    "event": {
      "id": 1,
      "name": "Summer Music Festival 2026",
      "venue": "Nhà hát lớn Hà Nội",
      "eventDate": "2026-08-15T19:00:00Z"
    },
    "items": [
      {
        "orderItemId": 201,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "unitPrice": 1500000
      },
      {
        "orderItemId": 202,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 2,
        "unitPrice": 1500000
      }
    ],
    "totalAmount": 3000000,
    "customer": {
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "phone": "0912345678"
    }
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 410 — Hold đã hết hạn
{
  "success": false,
  "error": {
    "code": "HOLD_EXPIRED",
    "message": "Thời gian giữ ghế đã hết, vui lòng chọn lại",
    "details": { "expiredAt": "2026-05-01T14:30:00Z" }
  }
}
```

- **Related screen:** `OrderConfirmation`

---

### POST /checkout/{holdId}/confirm

> ⚠️ **ENDPOINT QUAN TRỌNG — Xem đặc tả chi tiết tại Mục 5.2**

- **Access:** CUSTOMER
- **Description:** Xác nhận thanh toán (giả lập). Hoàn tất toàn bộ vòng đời giao dịch.

**Path Params:** `holdId` — ID của SeatHold cần confirm

**Request Body:** *(Không cần body trong scope giả lập)*
```json
{}
```

**Xử lý backend (bắt buộc theo thứ tự, trong một DB transaction):**
1. Validate JWT, lấy `userId`
2. Load `SeatHold` với `id = holdId`
3. Kiểm tra `hold.user_id == userId` → nếu không: `HOLD_NOT_OWNED_BY_USER (403)`
4. Kiểm tra `hold.status == ACTIVE` → nếu không: `HOLD_NOT_ACTIVE (422)`
5. Kiểm tra `hold.expires_at > NOW()` → nếu không: `HOLD_EXPIRED (410)`
6. Với từng `SeatHoldItem` trong hold:
   - `SELECT * FROM event_seats WHERE id = :seatId FOR UPDATE`
   - Kiểm tra `seat.status == LOCKED` và `seat.held_by == userId`
   - Update `EventSeat`: `status = SOLD`, `price_at_sale = item.price_snapshot`
7. Tìm Order với `hold_id = holdId`, `status = PENDING` → update `status = PAID`, `paid_at = NOW()`
8. Với từng `OrderItem`:
   - Tạo `Ticket` (`ticket_code = UUID`, `status = VALID`, `issued_at = NOW()`)
9. Update `SeatHold`: `status = CONVERTED`, `converted_at = NOW()`, `order_id = orderId`
10. **Commit transaction**
11. **Emit WebSocket events** (sau commit):
    - `seat_sold` cho từng ghế → `/topic/seats/{eventId}`
    - `dashboard_updated` → `/topic/admin/dashboard/{eventId}`
12. Trả response

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "order": {
      "orderId": 100,
      "orderCode": "TKR-20260501-0100",
      "status": "PAID",
      "totalAmount": 3000000,
      "paidAt": "2026-05-01T14:35:22Z",
      "event": {
        "id": 1,
        "name": "Summer Music Festival 2026",
        "venue": "Nhà hát lớn Hà Nội",
        "eventDate": "2026-08-15T19:00:00Z"
      }
    },
    "tickets": [
      {
        "ticketId": 301,
        "ticketCode": "a3f8c2d1-4e5b-6789-abcd-ef0123456789",
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "status": "VALID",
        "issuedAt": "2026-05-01T14:35:22Z"
      },
      {
        "ticketId": 302,
        "ticketCode": "b4e9d3e2-5f6c-789a-bcde-f01234567890",
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 2,
        "status": "VALID",
        "issuedAt": "2026-05-01T14:35:22Z"
      }
    ]
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 403 — Không phải chủ sở hữu hold
{
  "success": false,
  "error": {
    "code": "HOLD_NOT_OWNED_BY_USER",
    "message": "Bạn không phải chủ sở hữu phiên giữ ghế này",
    "details": {}
  }
}

// 410 — Hold đã hết hạn
{
  "success": false,
  "error": {
    "code": "HOLD_EXPIRED",
    "message": "Thời gian giữ ghế đã hết, vui lòng chọn lại",
    "details": {
      "expiredAt": "2026-05-01T14:30:00Z"
    }
  }
}

// 422 — Hold không còn active (đã converted hoặc released)
{
  "success": false,
  "error": {
    "code": "HOLD_NOT_ACTIVE",
    "message": "Phiên giữ ghế không còn hiệu lực",
    "details": { "holdStatus": "RELEASED" }
  }
}
```

**WebSocket Events phát ra:**
```json
// Topic: /topic/seats/{eventId} — lặp cho từng ghế
{
  "type": "SEAT_SOLD",
  "seatId": 1001,
  "status": "SOLD"
}

// Topic: /topic/admin/dashboard/{eventId}
{
  "type": "DASHBOARD_UPDATED",
  "eventId": 1,
  "newRevenue": 3000000,
  "soldSeatsCount": 60
}
```

- **Business rules:** BR-05, BR-06, BR-07
- **Related screen:** `OrderConfirmation` → `BookingSuccess`

---

### GET /orders/{orderId}

- **Access:** CUSTOMER
- **Description:** Lấy chi tiết một đơn hàng. Dùng cho màn hình BookingSuccess và lịch sử.

**Path Params:** `orderId`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "orderId": 100,
    "orderCode": "TKR-20260501-0100",
    "status": "PAID",
    "totalAmount": 3000000,
    "paidAt": "2026-05-01T14:35:22Z",
    "event": {
      "id": 1,
      "name": "Summer Music Festival 2026",
      "venue": "Nhà hát lớn Hà Nội",
      "eventDate": "2026-08-15T19:00:00Z",
      "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg"
    },
    "items": [
      {
        "orderItemId": 201,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "unitPrice": 1500000,
        "ticket": {
          "ticketId": 301,
          "ticketCode": "a3f8c2d1-4e5b-6789-abcd-ef0123456789",
          "status": "VALID"
        }
      }
    ]
  },
  "meta": {}
}
```

- **Related screen:** `BookingSuccess`

---

## 3.6 Ticket APIs

---

### GET /tickets/my

- **Access:** CUSTOMER
- **Description:** Lấy danh sách tất cả vé của user hiện tại.

**Query Params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | int | ❌ | `0` | Số trang |
| `size` | int | ❌ | `20` | Items mỗi trang |
| `status` | string | ❌ | — | Filter: `VALID`, `USED`, `CANCELLED` |

**Success Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "ticketId": 301,
      "ticketCode": "a3f8c2d1-4e5b-6789-abcd-ef0123456789",
      "status": "VALID",
      "issuedAt": "2026-05-01T14:35:22Z",
      "event": {
        "id": 1,
        "name": "Summer Music Festival 2026",
        "venue": "Nhà hát lớn Hà Nội",
        "eventDate": "2026-08-15T19:00:00Z",
        "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg"
      },
      "seat": {
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "price": 1500000
      }
    }
  ],
  "meta": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

- **Related screen:** `MyTickets`

---

### GET /tickets/{ticketId}

- **Access:** CUSTOMER
- **Description:** Lấy chi tiết một vé, bao gồm `ticketCode` để render QR.

**Path Params:** `ticketId`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "ticketId": 301,
    "ticketCode": "a3f8c2d1-4e5b-6789-abcd-ef0123456789",
    "status": "VALID",
    "issuedAt": "2026-05-01T14:35:22Z",
    "event": {
      "id": 1,
      "name": "Summer Music Festival 2026",
      "description": "Đêm nhạc hoành tráng...",
      "venue": "Nhà hát lớn Hà Nội",
      "eventDate": "2026-08-15T19:00:00Z",
      "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg"
    },
    "seat": {
      "zoneName": "Khu A - VIP",
      "rowLabel": "A",
      "seatNumber": 1,
      "price": 1500000
    },
    "order": {
      "orderCode": "TKR-20260501-0100",
      "paidAt": "2026-05-01T14:35:22Z"
    }
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 403 — Không phải chủ sở hữu
{
  "success": false,
  "error": {
    "code": "TICKET_NOT_OWNED_BY_USER",
    "message": "Vé này không thuộc về bạn",
    "details": {}
  }
}
```

- **Notes:** `ticketCode` (UUID) là nội dung được `qrcode.react` render thành QR image trên frontend.
- **Related screen:** `TicketDetails`

---

## 3.7 Queue APIs

---

### GET /queue/{eventId}/status

- **Access:** PUBLIC
- **Description:** Kiểm tra queue có đang active cho event này không. Frontend gọi trước khi redirect vào seat map.

**Path Params:** `eventId`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "queueActive": true,
    "currentQueueLength": 284,
    "estimatedWaitMinutes": 6
  },
  "meta": {}
}
```

- **Related screen:** `EventDetails` → `VirtualWaitingRoom`

---

### POST /queue/{eventId}/join

- **Access:** CUSTOMER
- **Description:** User tham gia hàng chờ. Trả về position và token.

**Path Params:** `eventId`

**Xử lý backend:**
1. Kiểm tra user chưa có QueueSession WAITING trong event này → nếu có: `QUEUE_ALREADY_JOINED (409)`
2. Tạo `QueueSession` với position = next available position
3. Trả về token + position

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "sessionId": 500,
    "queueToken": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "position": 284,
    "estimatedWaitSeconds": 360
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 409 — Đã trong hàng chờ
{
  "success": false,
  "error": {
    "code": "QUEUE_ALREADY_JOINED",
    "message": "Bạn đã có mặt trong hàng chờ của sự kiện này",
    "details": { "currentPosition": 180 }
  }
}
```

- **Related screen:** `VirtualWaitingRoom`

---

### GET /queue/position/{queueToken}

- **Access:** CUSTOMER
- **Description:** Polling endpoint — Frontend gọi mỗi 3 giây để cập nhật vị trí và kiểm tra có được vào chưa.

**Path Params:** `queueToken` — UUID từ join response

**Success Response `200` — Đang chờ:**
```json
{
  "success": true,
  "data": {
    "status": "WAITING",
    "position": 45,
    "estimatedWaitSeconds": 54
  },
  "meta": {}
}
```

**Success Response `200` — Được vào:**
```json
{
  "success": true,
  "data": {
    "status": "ADMITTED",
    "position": 0,
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "accessExpiresAt": "2026-05-01T14:50:00Z"
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 410 — Token hết hạn
{
  "success": false,
  "error": {
    "code": "QUEUE_TOKEN_EXPIRED",
    "message": "Token hàng chờ đã hết hạn, vui lòng xếp hàng lại",
    "details": {}
  }
}
```

- **Related screen:** `VirtualWaitingRoom`

---

## 3.8 Admin — Event Management APIs

---

### GET /admin/events

- **Access:** ADMIN
- **Description:** Lấy toàn bộ events không lọc status. Hỗ trợ filter, search, sort.

**Query Params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | int | ❌ | `0` | Số trang |
| `size` | int | ❌ | `20` | Items mỗi trang |
| `search` | string | ❌ | — | Tìm theo tên event |
| `status` | string | ❌ | — | Filter: `UPCOMING`, `ON_SALE`, `ENDED`, `CANCELLED` |
| `sort` | string | ❌ | `createdAt,desc` | Sort field |

**Success Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Summer Music Festival 2026",
      "venue": "Nhà hát lớn Hà Nội",
      "eventDate": "2026-08-15T19:00:00Z",
      "status": "ON_SALE",
      "totalSeats": 500,
      "soldSeats": 58,
      "lockedSeats": 12,
      "availableSeats": 430,
      "revenue": 87000000,
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "meta": {
    "page": 0, "size": 20, "totalElements": 5, "totalPages": 1,
    "hasNext": false, "hasPrevious": false
  }
}
```

- **Related screen:** `EventManagement`

---

### POST /admin/events

- **Access:** ADMIN
- **Description:** Tạo event mới. Status mặc định là `UPCOMING`.

**Request Body:**
```json
{
  "name": "Summer Music Festival 2026",
  "description": "Đêm nhạc hoành tráng...",
  "venue": "Nhà hát lớn Hà Nội",
  "eventDate": "2026-08-15T19:00:00Z",
  "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | ✅ | 2–500 ký tự |
| `description` | string | ❌ | Max 5000 ký tự |
| `venue` | string | ✅ | 2–500 ký tự |
| `eventDate` | string (ISO 8601) | ✅ | Phải > NOW() |
| `imageUrl` | string | ❌ | URL hợp lệ |

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Summer Music Festival 2026",
    "venue": "Nhà hát lớn Hà Nội",
    "eventDate": "2026-08-15T19:00:00Z",
    "imageUrl": "https://cdn.ticketrush.io/events/1/banner.jpg",
    "status": "UPCOMING",
    "createdAt": "2026-05-01T10:00:00Z"
  },
  "meta": {}
}
```

- **Related screen:** `CreateEvent`

---

### PATCH /admin/events/{eventId}

- **Access:** ADMIN
- **Description:** Cập nhật thông tin event. Chỉ cho phép sửa khi event còn `UPCOMING`.

**Path Params:** `eventId`

**Request Body:** *(Partial update — chỉ gửi fields muốn thay đổi)*
```json
{
  "name": "Summer Music Festival 2026 - Updated",
  "venue": "Nhà hát lớn Hà Nội - Sân khấu chính"
}
```

**Success Response `200`:** *(Trả về object event đã cập nhật)*

- **Related screen:** `EventManagement`

---

### PATCH /admin/events/{eventId}/status

- **Access:** ADMIN
- **Description:** Thay đổi status của event.

**Path Params:** `eventId`

**Query Params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | ✅ | Target status: `ON_SALE`, `ENDED`, `CANCELLED` |

**Transitions hợp lệ:**
- `UPCOMING → ON_SALE`
- `ON_SALE → ENDED`
- `UPCOMING → CANCELLED`
- `ON_SALE → CANCELLED`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "ON_SALE",
    "updatedAt": "2026-05-01T12:00:00Z"
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 422 — Transition không hợp lệ
{
  "success": false,
  "error": {
    "code": "EVENT_INVALID_STATUS_TRANSITION",
    "message": "Không thể chuyển trạng thái sự kiện theo cách này",
    "details": {
      "currentStatus": "ENDED",
      "requestedStatus": "ON_SALE"
    }
  }
}
```

- **Related screen:** `EventManagement`

---

## 3.9 Admin — Seat Configuration APIs

---

### GET /admin/events/{eventId}/seat-zones

- **Access:** ADMIN
- **Description:** Lấy cấu hình zone ghế của event.

**Path Params:** `eventId`

**Success Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "zoneId": 10,
      "name": "Khu A - VIP",
      "price": 1500000,
      "colorCode": "#4F46E5",
      "totalRows": 10,
      "seatsPerRow": 10,
      "totalSeats": 100,
      "availableSeats": 42,
      "soldSeats": 58
    }
  ],
  "meta": {}
}
```

- **Related screen:** `SeatLayoutConfig`

---

### POST /admin/events/{eventId}/seat-zones

- **Access:** ADMIN
- **Description:** Tạo/thay thế toàn bộ cấu hình zone ghế. Sinh tự động tất cả `EventSeat` records. **Chỉ thực hiện được khi event còn `UPCOMING`.**

**Path Params:** `eventId`

**Request Body:**
```json
{
  "zones": [
    {
      "name": "Khu A - VIP",
      "price": 1500000,
      "colorCode": "#4F46E5",
      "totalRows": 10,
      "seatsPerRow": 10
    },
    {
      "name": "Khu B - Standard",
      "price": 800000,
      "colorCode": "#10B981",
      "totalRows": 20,
      "seatsPerRow": 20
    }
  ]
}
```

**Xử lý backend:**
1. Kiểm tra event status == `UPCOMING` → nếu không: `SEAT_CONFIG_LOCKED`
2. Xóa toàn bộ zones và seats cũ (nếu có)
3. Với mỗi zone, tạo `SeatZone` record
4. Sinh `EventSeat` records: với mỗi row (A, B, C...) × mỗi seat (1..seatsPerRow), tạo một EventSeat với `status = AVAILABLE`
5. Label hàng: tự động từ A→Z (nếu > 26 hàng: AA, AB...)

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "zonesCreated": 2,
    "totalSeatsGenerated": 500,
    "zones": [
      {
        "zoneId": 10,
        "name": "Khu A - VIP",
        "price": 1500000,
        "totalSeats": 100
      },
      {
        "zoneId": 11,
        "name": "Khu B - Standard",
        "price": 800000,
        "totalSeats": 400
      }
    ]
  },
  "meta": {}
}
```

**Error Responses:**
```json
// 422 — Event đang ON_SALE, không thể thay đổi cấu hình
{
  "success": false,
  "error": {
    "code": "SEAT_CONFIG_LOCKED",
    "message": "Không thể thay đổi cấu hình ghế khi sự kiện đã mở bán",
    "details": { "eventStatus": "ON_SALE" }
  }
}
```

- **Related screen:** `SeatLayoutConfig`

---

## 3.10 Admin — Dashboard APIs

---

### GET /admin/dashboard/{eventId}

- **Access:** ADMIN
- **Description:** Lấy toàn bộ metrics realtime cho một event. Frontend polling endpoint này mỗi 5 giây.

**Path Params:** `eventId`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "eventName": "Summer Music Festival 2026",
    "summary": {
      "totalSeats": 500,
      "soldSeats": 266,
      "lockedSeats": 12,
      "availableSeats": 222,
      "fillRate": 53.2,
      "totalRevenue": 279500000
    },
    "fillRateByZone": [
      {
        "zoneId": 10,
        "zoneName": "Khu A - VIP",
        "totalSeats": 100,
        "soldSeats": 74,
        "fillRate": 74.0,
        "revenue": 111000000
      },
      {
        "zoneId": 11,
        "zoneName": "Khu B - Standard",
        "totalSeats": 400,
        "soldSeats": 192,
        "fillRate": 48.0,
        "revenue": 153600000
      }
    ],
    "revenueByHour": [
      { "hour": "2026-05-01T10:00:00Z", "revenue": 45000000, "ticketsSold": 30 },
      { "hour": "2026-05-01T11:00:00Z", "revenue": 76500000, "ticketsSold": 51 }
    ],
    "audienceByAge": [
      { "ageGroup": "18-24", "count": 85, "percentage": 31.9 },
      { "ageGroup": "25-34", "count": 112, "percentage": 42.1 },
      { "ageGroup": "35-44", "count": 51, "percentage": 19.2 },
      { "ageGroup": "45+", "count": 18, "percentage": 6.8 }
    ],
    "audienceByGender": [
      { "gender": "MALE", "count": 148, "percentage": 55.6 },
      { "gender": "FEMALE", "count": 110, "percentage": 41.4 },
      { "gender": "OTHER", "count": 8, "percentage": 3.0 }
    ],
    "recentOrders": [
      {
        "orderId": 100,
        "orderCode": "TKR-20260501-0100",
        "customerName": "Nguyễn Văn A",
        "ticketCount": 2,
        "totalAmount": 3000000,
        "paidAt": "2026-05-01T14:35:22Z"
      }
    ]
  },
  "meta": {
    "generatedAt": "2026-05-01T14:30:00Z"
  }
}
```

- **Notes:** `totalRevenue` và fill rate chỉ tính ghế `SOLD`. Ghế `LOCKED` không tính (BR-07).
- **Related screen:** `AdminDashboard`

---

## 3.11 Admin — Order Management APIs

---

### GET /admin/orders

- **Access:** ADMIN
- **Description:** Lấy danh sách tất cả orders của toàn hệ thống.

**Query Params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | int | ❌ | `0` | Số trang |
| `size` | int | ❌ | `20` | Items mỗi trang |
| `search` | string | ❌ | — | Tìm theo orderCode hoặc email/tên khách |
| `eventId` | long | ❌ | — | Filter theo event |
| `status` | string | ❌ | — | Filter: `PENDING`, `PAID`, `EXPIRED`, `CANCELLED` |
| `fromDate` | string | ❌ | — | ISO date — filter từ ngày |
| `toDate` | string | ❌ | — | ISO date — filter đến ngày |
| `sort` | string | ❌ | `createdAt,desc` | Sort field |

**Success Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": 100,
      "orderCode": "TKR-20260501-0100",
      "status": "PAID",
      "customer": {
        "id": 42,
        "fullName": "Nguyễn Văn A",
        "email": "user@example.com"
      },
      "event": {
        "id": 1,
        "name": "Summer Music Festival 2026"
      },
      "ticketCount": 2,
      "totalAmount": 3000000,
      "paidAt": "2026-05-01T14:35:22Z",
      "createdAt": "2026-05-01T14:30:00Z"
    }
  ],
  "meta": {
    "page": 0, "size": 20, "totalElements": 266,
    "totalPages": 14, "hasNext": true, "hasPrevious": false
  }
}
```

- **Related screen:** `OrderManagement`

---

### GET /admin/orders/{orderId}

- **Access:** ADMIN
- **Description:** Lấy chi tiết đầy đủ một đơn hàng bao gồm tickets.

**Path Params:** `orderId`

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "orderId": 100,
    "orderCode": "TKR-20260501-0100",
    "status": "PAID",
    "totalAmount": 3000000,
    "createdAt": "2026-05-01T14:30:00Z",
    "paidAt": "2026-05-01T14:35:22Z",
    "customer": {
      "id": 42,
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "phone": "0912345678"
    },
    "event": {
      "id": 1,
      "name": "Summer Music Festival 2026",
      "venue": "Nhà hát lớn Hà Nội",
      "eventDate": "2026-08-15T19:00:00Z"
    },
    "items": [
      {
        "orderItemId": 201,
        "zoneName": "Khu A - VIP",
        "rowLabel": "A",
        "seatNumber": 1,
        "unitPrice": 1500000,
        "ticket": {
          "ticketId": 301,
          "ticketCode": "a3f8c2d1-4e5b-6789-abcd-ef0123456789",
          "status": "VALID",
          "issuedAt": "2026-05-01T14:35:22Z"
        }
      }
    ]
  },
  "meta": {}
}
```

- **Related screen:** `OrderManagement`

---

## 4. WebSocket Events

### 4.1 Subscription Topics

| Topic | Subscriber | Mô tả |
|---|---|---|
| `/topic/seats/{eventId}` | Customer đang xem seat map | Cập nhật trạng thái ghế realtime |
| `/topic/admin/dashboard/{eventId}` | Admin đang xem dashboard | Cập nhật metrics realtime |

### 4.2 Event Payloads

**SEAT_LOCKED** — Phát khi hold thành công:
```json
{
  "type": "SEAT_LOCKED",
  "eventId": 1,
  "seatId": 1001,
  "status": "LOCKED",
  "timestamp": "2026-05-01T14:30:00Z"
}
```

**SEAT_AVAILABLE** — Phát khi release (thủ công hoặc auto):
```json
{
  "type": "SEAT_AVAILABLE",
  "eventId": 1,
  "seatId": 1001,
  "status": "AVAILABLE",
  "timestamp": "2026-05-01T14:40:05Z"
}
```

**SEAT_SOLD** — Phát khi checkout confirm:
```json
{
  "type": "SEAT_SOLD",
  "eventId": 1,
  "seatId": 1001,
  "status": "SOLD",
  "timestamp": "2026-05-01T14:35:22Z"
}
```

**DASHBOARD_UPDATED** — Phát sau mỗi lần có giao dịch PAID:
```json
{
  "type": "DASHBOARD_UPDATED",
  "eventId": 1,
  "soldSeats": 266,
  "lockedSeats": 12,
  "availableSeats": 222,
  "fillRate": 53.2,
  "totalRevenue": 279500000,
  "timestamp": "2026-05-01T14:35:22Z"
}
```

---

## 5. Đặc tả chi tiết các endpoint quan trọng

---

### 5.1 POST /events/{eventId}/seats/{seatId}/hold — Full Spec

```
Method:  POST
Path:    /api/v1/events/{eventId}/seats/{seatId}/hold
Access:  CUSTOMER (JWT required)
```

**Sequence Diagram:**

```
Customer        Frontend        Backend                 DB              WebSocket
   |               |               |                    |                   |
   |--click seat-->|               |                    |                   |
   |               |--POST /hold-->|                    |                   |
   |               |               |--BEGIN TRANSACTION-|                   |
   |               |               |--SELECT FOR UPDATE-|                   |
   |               |               |<--seat row locked--|                   |
   |               |               |                    |                   |
   |               |               |--check status==AVAILABLE               |
   |               |               |--check held_count < 2                  |
   |               |               |                    |                   |
   |               |               |--UPDATE seat LOCKED|                   |
   |               |               |--INSERT SeatHold   |                   |
   |               |               |--INSERT HoldItem   |                   |
   |               |               |--COMMIT------------|                   |
   |               |               |                    |                   |
   |               |               |----emit SEAT_LOCKED------------------->|
   |               |               |                    |              (broadcast)
   |               |<--200 + hold--|                    |                   |
   |<--UI update---|               |                    |                   |
```

**Backend validation checklist (theo thứ tự):**

| Bước | Kiểm tra | Lỗi trả về nếu fail |
|---|---|---|
| 1 | JWT hợp lệ, extract userId | `AUTH_TOKEN_INVALID (401)` |
| 2 | Event tồn tại | `EVENT_NOT_FOUND (404)` |
| 3 | Event.status == ON_SALE | `EVENT_NOT_ON_SALE (422)` |
| 4 | Seat tồn tại và thuộc event | `SEAT_NOT_FOUND (404)` |
| 5 | `SELECT * FROM event_seats WHERE id=? FOR UPDATE` | — |
| 6 | seat.status == AVAILABLE | `SEAT_NOT_AVAILABLE (409)` |
| 7 | Count(active held items of user in event) < 2 | `HOLD_LIMIT_EXCEEDED (422)` |
| 8 | INSERT/UPDATE SeatHold + HoldItem + UPDATE EventSeat | `INTERNAL_SERVER_ERROR (500)` |
| 9 | COMMIT | — |
| 10 | Emit WebSocket SEAT_LOCKED | — (non-blocking, best effort) |

**Lưu ý concurrency:**
- Bước 5 (`SELECT FOR UPDATE`) là bắt buộc. Nếu bỏ, hai user click cùng lúc sẽ cùng đọc status=AVAILABLE và cùng update thành LOCKED → bán trùng ghế.
- Nếu DB timeout do lock contention → trả `500` với message "Hệ thống đang bận, vui lòng thử lại".
- WebSocket emit phải xảy ra **sau** khi transaction commit, không phải trong transaction.

---

### 5.2 POST /checkout/{holdId}/confirm — Full Spec

```
Method:  POST
Path:    /api/v1/checkout/{holdId}/confirm
Access:  CUSTOMER (JWT required)
```

**Sequence Diagram:**

```
Customer        Frontend        Backend                     DB              WebSocket
   |               |               |                        |                   |
   |--click XÁC NHẬN-->|           |                        |                   |
   |               |--POST /confirm-->|                      |                   |
   |               |               |--load hold-------------|                   |
   |               |               |--verify ownership      |                   |
   |               |               |--verify status==ACTIVE |                   |
   |               |               |--verify expires_at>NOW |                   |
   |               |               |                        |                   |
   |               |               |--BEGIN TRANSACTION-----|                   |
   |               |               |  FOR each seat:        |                   |
   |               |               |    SELECT FOR UPDATE   |                   |
   |               |               |    verify LOCKED+owned |                   |
   |               |               |    UPDATE → SOLD       |                   |
   |               |               |  UPDATE Order → PAID   |                   |
   |               |               |  INSERT Tickets        |                   |
   |               |               |  UPDATE Hold → CONVERTED                  |
   |               |               |--COMMIT----------------|                   |
   |               |               |                        |                   |
   |               |               |--emit SEAT_SOLD (each)-------------------->|
   |               |               |--emit DASHBOARD_UPDATED------------------->|
   |               |<--200 + tickets--|                     |              (broadcast)
   |<--redirect BookingSuccess     |                        |                   |
```

**Backend validation checklist (theo thứ tự, trước transaction):**

| Bước | Kiểm tra | Lỗi trả về nếu fail |
|---|---|---|
| 1 | JWT hợp lệ, extract userId | `AUTH_TOKEN_INVALID (401)` |
| 2 | Hold tồn tại | `HOLD_NOT_FOUND (404)` |
| 3 | hold.user_id == userId | `HOLD_NOT_OWNED_BY_USER (403)` |
| 4 | hold.status == ACTIVE | `HOLD_NOT_ACTIVE (422)` |
| 5 | hold.expires_at > NOW() | `HOLD_EXPIRED (410)` |

**Trong transaction (với từng seat):**

| Bước | Kiểm tra | Xử lý nếu fail |
|---|---|---|
| 6 | SELECT * FROM event_seats WHERE id=? FOR UPDATE | — |
| 7 | seat.status == LOCKED và seat.held_by == userId | ROLLBACK → `HOLD_NOT_ACTIVE (422)` |
| 8 | UPDATE seat: status=SOLD, price_at_sale=snapshot | — |

**Sau transaction:**

| Bước | Action |
|---|---|
| 9 | UPDATE Order: status=PAID, paid_at=NOW() |
| 10 | INSERT Ticket cho mỗi OrderItem (ticket_code=UUID) |
| 11 | UPDATE SeatHold: status=CONVERTED, converted_at=NOW(), order_id=orderId |
| 12 | Emit WebSocket SEAT_SOLD (mỗi ghế) |
| 13 | Emit WebSocket DASHBOARD_UPDATED |

**Idempotency note:**
Nếu client gửi request 2 lần (double submit), lần 2 sẽ fail ở bước 4 (`hold.status != ACTIVE` → đã là `CONVERTED`) và trả `HOLD_NOT_ACTIVE`. Frontend không nên retry tự động.

---

## 6. Endpoint Index (Quick Reference)

### Public
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Đăng ký |
| `POST` | `/auth/login` | Đăng nhập |
| `GET` | `/events` | Danh sách events |
| `GET` | `/events/{id}` | Chi tiết event |
| `GET` | `/queue/{eventId}/status` | Kiểm tra queue |

### Customer
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/logout` | Đăng xuất |
| `GET` | `/auth/me` | Thông tin user |
| `GET` | `/events/{eventId}/seats` | Seat map |
| `POST` | `/events/{eventId}/seats/{seatId}/hold` | Giữ ghế ⚠️ |
| `DELETE` | `/events/{eventId}/seats/{seatId}/hold` | Bỏ giữ ghế |
| `GET` | `/holds/active` | Hold đang active |
| `POST` | `/orders` | Tạo order |
| `GET` | `/orders/{orderId}` | Chi tiết order |
| `POST` | `/checkout/{holdId}/confirm` | Xác nhận thanh toán ⚠️ |
| `GET` | `/tickets/my` | Danh sách vé |
| `GET` | `/tickets/{ticketId}` | Chi tiết vé + QR |
| `POST` | `/queue/{eventId}/join` | Tham gia hàng chờ |
| `GET` | `/queue/position/{token}` | Vị trí hàng chờ |

### Admin
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/events` | Danh sách events |
| `POST` | `/admin/events` | Tạo event |
| `PATCH` | `/admin/events/{id}` | Cập nhật event |
| `PATCH` | `/admin/events/{id}/status` | Thay đổi status event |
| `GET` | `/admin/events/{id}/seat-zones` | Cấu hình zone ghế |
| `POST` | `/admin/events/{id}/seat-zones` | Lưu cấu hình zone ghế |
| `GET` | `/admin/dashboard/{eventId}` | Dashboard analytics |
| `GET` | `/admin/orders` | Danh sách orders |
| `GET` | `/admin/orders/{orderId}` | Chi tiết order |
