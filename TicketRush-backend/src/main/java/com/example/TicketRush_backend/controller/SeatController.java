package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.hold.HoldResponse;
import com.example.TicketRush_backend.dto.seat.SeatMapResponse;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.SeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/events/{eventId}/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    /**
     * GET /api/v1/events/{eventId}/seats
     * Trả về sơ đồ ghế đầy đủ, nhóm theo zone → row → seat.
     * heldByMe = true nếu user đang giữ ghế đó.
     * Access: CUSTOMER (authenticated)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<SeatMapResponse>> getSeatMap(
            @PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        SeatMapResponse map = seatService.getSeatMap(eventId, userId);
        return ResponseEntity.ok(ApiResponse.ok(map));
    }

    /**
     * POST /api/v1/events/{eventId}/seats/{seatId}/hold
     * Giữ một ghế. Backend dùng SELECT FOR UPDATE để tránh bán trùng.
     * Access: CUSTOMER
     */
    @PostMapping("/{seatId}/hold")
    public ResponseEntity<ApiResponse<HoldResponse>> holdSeat(
            @PathVariable Long eventId,
            @PathVariable Long seatId) {
        Long userId = SecurityUtils.getCurrentUserId();
        HoldResponse response = seatService.holdSeat(eventId, seatId, userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * DELETE /api/v1/events/{eventId}/seats/{seatId}/hold
     * Bỏ giữ ghế thủ công. Chỉ owner của ghế mới được thực hiện.
     * Access: CUSTOMER
     */
    @DeleteMapping("/{seatId}/hold")
    public ResponseEntity<ApiResponse<HoldResponse>> releaseSeat(
            @PathVariable Long eventId,
            @PathVariable Long seatId) {
        Long userId = SecurityUtils.getCurrentUserId();
        HoldResponse response = seatService.releaseSeat(eventId, seatId, userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
