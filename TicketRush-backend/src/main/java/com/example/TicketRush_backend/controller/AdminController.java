package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.event.CreateEventRequest;
import com.example.TicketRush_backend.dto.event.EventResponse;
import com.example.TicketRush_backend.dto.event.UpdateEventRequest;
import com.example.TicketRush_backend.dto.order.OrderResponse;
import com.example.TicketRush_backend.dto.seat.CreateSeatZonesRequest;
import com.example.TicketRush_backend.dto.seat.SeatZoneResponse;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.EventService;
import com.example.TicketRush_backend.service.OrderService;
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

    @PostMapping("/events")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest req) {
        Long adminId = SecurityUtils.getCurrentUserId();
        EventResponse created = eventService.createEvent(req, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
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

    // ── Seat Zones ─────────────────────────────────────────────

    @GetMapping("/events/{eventId}/seat-zones")
    public ResponseEntity<ApiResponse<List<SeatZoneResponse>>> getSeatZones(
            @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(eventService.getSeatZones(eventId)));
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
}
