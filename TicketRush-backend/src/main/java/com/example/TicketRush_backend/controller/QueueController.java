package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.queue.JoinQueueResponse;
import com.example.TicketRush_backend.dto.queue.QueuePositionResponse;
import com.example.TicketRush_backend.dto.queue.QueueStatusResponse;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.QueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/queue")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    /**
     * GET /api/v1/queue/{eventId}/status
     * PUBLIC — check if queue is active and current length.
     * Queue is always active for ON_SALE events.
     */
    @GetMapping("/{eventId}/status")
    public ResponseEntity<ApiResponse<QueueStatusResponse>> getQueueStatus(
            @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(queueService.getQueueStatus(eventId)));
    }

    /**
     * POST /api/v1/queue/{eventId}/join
     * CUSTOMER — join queue (or resume existing session).
     * Always allowed for ON_SALE events; idempotent.
     */
    @PostMapping("/{eventId}/join")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<JoinQueueResponse>> joinQueue(
            @PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        JoinQueueResponse response = queueService.joinQueue(eventId, userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * GET /api/v1/queue/position/{queueToken}
     * AUTHENTICATED — poll position and status every 2 seconds.
     * Returns ADMITTED when user can enter seat selection.
     */
    @GetMapping("/position/{queueToken}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<QueuePositionResponse>> getPosition(
            @PathVariable UUID queueToken) {
        return ResponseEntity.ok(ApiResponse.ok(queueService.getPosition(queueToken)));
    }

    /**
     * PATCH /api/v1/admin/events/{eventId}/queue
     * ADMIN — toggle queue flag (deprecated, kept for backward compat).
     */
    @PatchMapping("/admin/{eventId}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> toggleQueue(
            @PathVariable Long eventId,
            @RequestParam boolean active) {
        queueService.setQueueActive(eventId, active);
        return ResponseEntity.ok(ApiResponse.noContent());
    }

    /**
     * GET /api/v1/queue/system/status
     * PUBLIC — trạng thái system queue (hiển thị trước khi join).
     */
    @GetMapping("/system/status")
    public ResponseEntity<ApiResponse<QueueStatusResponse>> getSystemQueueStatus() {
        return ResponseEntity.ok(ApiResponse.ok(queueService.getSystemQueueStatus()));
    }

    /**
     * POST /api/v1/queue/system/join
     * AUTHENTICATED — join system queue ngay sau khi đăng nhập.
     * Idempotent: nếu còn session hợp lệ → trả về cái cũ.
     */
    @PostMapping("/system/join")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<JoinQueueResponse>> joinSystemQueue() {
        Long userId = SecurityUtils.getCurrentUserId();
        JoinQueueResponse response = queueService.joinSystemQueue(userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}