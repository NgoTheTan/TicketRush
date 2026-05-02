package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.hold.ActiveHoldResponse;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.SeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/holds")
@RequiredArgsConstructor
public class HoldController {

    private final SeatService seatService;

    /**
     * GET /api/v1/holds/active?eventId={eventId}
     * Lấy hold đang ACTIVE của user cho một event.
     * Dùng để khôi phục trạng thái khi user reload trang SeatSelection.
     * Trả data: null nếu không có hold active.
     * Access: CUSTOMER
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<ActiveHoldResponse>> getActiveHold(
            @RequestParam Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        ActiveHoldResponse hold = seatService.getActiveHold(eventId, userId).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(hold));
    }
}
