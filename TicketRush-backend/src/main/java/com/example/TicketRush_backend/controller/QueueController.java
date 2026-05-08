package com.example.TicketRush_backend.controller;

import com.example.TicketRush_backend.common.ApiResponse;
import com.example.TicketRush_backend.dto.queue.JoinQueueResponse;
import com.example.TicketRush_backend.dto.queue.QueuePositionResponse;
import com.example.TicketRush_backend.dto.queue.QueueStatusResponse;
import com.example.TicketRush_backend.security.SecurityUtils;
import com.example.TicketRush_backend.service.QueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
     * Access: PUBLIC
     * Frontend gọi từ EventDetails để quyết định có cần vào hàng chờ không.
     */
    @GetMapping("/{eventId}/status")
    public ResponseEntity<ApiResponse<QueueStatusResponse>> getQueueStatus(
            @PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.ok(queueService.getQueueStatus(eventId)));
    }

    /**
     * POST /api/v1/queue/{eventId}/join
     * Access: CUSTOMER
     * User tham gia hàng chờ cho sự kiện.
     */
    @PostMapping("/{eventId}/join")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<JoinQueueResponse>> joinQueue(
            @PathVariable Long eventId) {
        Long userId = SecurityUtils.getCurrentUserId();
        JoinQueueResponse response = queueService.joinQueue(eventId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * GET /api/v1/queue/position/{queueToken}
     * Access: CUSTOMER (authenticated)
     * Frontend polling mỗi 3 giây để kiểm tra vị trí và trạng thái.
     * Khi status == ADMITTED → frontend redirect vào seat selection.
     */
    @GetMapping("/position/{queueToken}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<QueuePositionResponse>> getPosition(
            @PathVariable UUID queueToken) {
        return ResponseEntity.ok(ApiResponse.ok(queueService.getPosition(queueToken)));
    }

    /**
     * PATCH /api/v1/admin/events/{eventId}/queue
     * Access: ADMIN
     * Bật/tắt virtual queue cho sự kiện.
     * Đặt trong AdminController để nhất quán với /api/v1/admin/**
     * Nhưng cũng để ở đây cho tiện (delegate tới QueueService).
     */
    @PatchMapping("/admin/{eventId}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> toggleQueue(
            @PathVariable Long eventId,
            @RequestParam boolean active) {
        queueService.setQueueActive(eventId, active);
        return ResponseEntity.ok(ApiResponse.noContent());
    }
}
