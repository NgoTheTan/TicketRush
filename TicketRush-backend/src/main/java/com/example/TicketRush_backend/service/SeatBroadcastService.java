package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.dto.ws.SeatUpdateMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * SeatBroadcastService — phát WebSocket events sau khi DB transaction commit.
 *
 * Rule: KHÔNG gọi trong transaction. Gọi sau khi @Transactional method hoàn tất.
 *
 * Topics:
 *   /topic/seats/{eventId}        — frontend SeatSelection subscribe
 *   /topic/admin/dashboard/{eventId} — admin dashboard (Sprint 4)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastSeatLocked(Long eventId, Long seatId) {
        send(eventId, seatId, "SEAT_LOCKED", "LOCKED");
    }

    public void broadcastSeatAvailable(Long eventId, Long seatId) {
        send(eventId, seatId, "SEAT_AVAILABLE", "AVAILABLE");
    }

    public void broadcastSeatSold(Long eventId, Long seatId) {
        send(eventId, seatId, "SEAT_SOLD", "SOLD");
    }

    /** Dùng khi auto-release nhiều ghế cùng lúc (Scheduler) */
    public void broadcastMultipleSeatsAvailable(Long eventId, Iterable<Long> seatIds) {
        for (Long seatId : seatIds) {
            send(eventId, seatId, "SEAT_AVAILABLE", "AVAILABLE");
        }
    }

    private void send(Long eventId, Long seatId, String type, String status) {
        String destination = "/topic/seats/" + eventId;
        SeatUpdateMessage message = SeatUpdateMessage.builder()
                .type(type)
                .eventId(eventId)
                .seatId(seatId)
                .status(status)
                .build();
        try {
            messagingTemplate.convertAndSend(destination, message);
            log.debug("[WS] {} seat={} → {}", type, seatId, destination);
        } catch (Exception e) {
            // WebSocket failure không được làm crash request — log và tiếp tục
            log.warn("[WS] Failed to broadcast {} for seat={}: {}", type, seatId, e.getMessage());
        }
    }
}
