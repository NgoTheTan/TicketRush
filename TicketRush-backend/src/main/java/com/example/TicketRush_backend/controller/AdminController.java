package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.event.CreateEventRequest;
import com.example.TicketRush_backend.dto.event.EventResponse;
import com.example.TicketRush_backend.dto.event.UpdateEventRequest;
import com.example.TicketRush_backend.dto.order.OrderResponse;
import com.example.TicketRush_backend.dto.seat.CreateSeatZonesRequest;
import com.example.TicketRush_backend.dto.seat.SeatMapResponse;
import com.example.TicketRush_backend.dto.seat.SeatZoneResponse;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.dto.dashboard.DashboardResponse;
import com.example.TicketRush_backend.service.DashboardService;
import com.example.TicketRush_backend.service.EventService;
import com.example.TicketRush_backend.service.QueueService;
import com.example.TicketRush_backend.service.OrderService;
import com.example.TicketRush_backend.service.SeatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final EventService eventService;
    private final OrderService orderService;
    private final DashboardService dashboardService;
    private final QueueService queueService;
    private final SeatService seatService;

    // ── Events ─────────────────────────────────────────────────

    @GetMapping("/events")
    public ResponseEntity<ApiResponse<List<EventResponse>>> listEvents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EventStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<EventResponse> result = eventService.listAllEvents(search, status,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), ApiResponse.PageMeta.of(result)));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads");
            if (!java.nio.file.Files.exists(uploadDir)) {
                java.nio.file.Files.createDirectories(uploadDir);
            }
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename().replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
            java.nio.file.Path filePath = uploadDir.resolve(fileName).toAbsolutePath();
            file.transferTo(filePath.toFile());

            return ResponseEntity.ok(ApiResponse.ok(Map.of("url", "/uploads/" + fileName)));
        } catch (Exception e) {
            throw new RuntimeException("Lỗi upload file: " + e.getMessage());
        }
    }

    @PostMapping("/events")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest req) {
        Long adminId = SecurityUtils.getCurrentUserId();
        EventResponse created = eventService.createEvent(req, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @GetMapping("/events/{eventId}")
    public ResponseEntity<ApiResponse<EventResponse>> getEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.getEventDetail(eventId)));
    }

    @PatchMapping("/events/{eventId}")
    public ResponseEntity<ApiResponse<EventResponse>> updateEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody UpdateEventRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.updateEvent(eventId, req)));
    }

    @PatchMapping("/events/{eventId}/status")
    public ResponseEntity<ApiResponse<EventResponse>> changeStatus(
            @PathVariable Long eventId,
            @RequestParam EventStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.changeStatus(eventId, status)));
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable Long eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok(ApiResponse.noContent());
    }

    // ── Seat Zones ─────────────────────────────────────────────

    @GetMapping("/events/{eventId}/seat-zones")
    public ResponseEntity<ApiResponse<List<SeatZoneResponse>>> getSeatZones(
            @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.getSeatZones(eventId)));
    }

    @GetMapping("/events/{eventId}/seat-map")
    public ResponseEntity<ApiResponse<SeatMapResponse>> getAdminSeatMap(
            @PathVariable Long eventId) {
        SeatMapResponse map = seatService.getSeatMap(eventId, null);
        return ResponseEntity.ok(ApiResponse.ok(map));
    }

    @PostMapping("/events/{eventId}/seat-zones")
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveSeatZones(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateSeatZonesRequest req) {
        Map<String, Object> result = eventService.saveSeatZones(eventId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    // ── Orders ─────────────────────────────────────────────────

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> listOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<OrderResponse> result = orderService.listOrders(search, status, eventId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), ApiResponse.PageMeta.of(result)));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrderAdmin(orderId)));
    }

    /**
     * PATCH /api/v1/admin/orders/{orderId}/status?status=CANCELLED
     * Admin cập nhật trạng thái đơn hàng (ví dụ: hủy đơn thủ công).
     * Hỗ trợ: CANCELLED (từ PENDING)
     */
    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.adminUpdateOrderStatus(orderId, status)));
    }

    // ── Dashboard Analytics (Sprint 4) ───────────────────────

    /**
     * GET /api/v1/admin/dashboard/{eventId}
     * Full analytics: revenue, fill rate, age/gender breakdown, recent orders.
     * Frontend polls every 5 seconds.
     */
    @GetMapping("/dashboard/{eventId}")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getDashboard(eventId)));
    }

        // ── Queue Management ───────────────────────────────────────

    /**
     * PATCH /api/v1/admin/events/{eventId}/queue?active=true|false
     * Bật/tắt virtual waiting room cho sự kiện.
     */
    @PatchMapping("/events/{eventId}/queue")
    public ResponseEntity<ApiResponse<Void>> toggleQueue(
            @PathVariable Long eventId,
            @RequestParam boolean active) {
        queueService.setQueueActive(eventId, active);
        return ResponseEntity.ok(ApiResponse.noContent());
    }
}