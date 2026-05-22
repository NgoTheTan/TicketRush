package com.example.TicketRush_backend.service;

import com.example.TicketRush_backend.dto.ws.DashboardUpdateMessage;
import com.example.TicketRush_backend.dto.ws.OrderUpdateMessage;
import com.example.TicketRush_backend.dto.ws.SeatUpdateMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;

/**
 * SeatBroadcastService — phát WebSocket events sau khi DB transaction commit.
 *
 * Rule: KHÔNG gọi trong transaction. Gọi sau khi @Transactional method hoàn tất.
 *
 * Topics:
 *   /topic/seats/{eventId}           — frontend SeatSelection subscribe (seat status)
 *   /topic/admin/seats/{eventId}     — admin EventSeatViewPage (seat status)
 *   /topic/admin/orders/{eventId}    — admin OrderManagementPage (new/updated orders)
 *   /topic/admin/orders/global       — admin toàn hệ thống (tất cả events)
 *   /topic/admin/dashboard/{eventId} — admin dashboard stats (summary counts)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    // ── Seat updates ──────────────────────────────────────────

    public void broadcastSeatLocked(Long eventId, Long seatId) {
        sendSeat(eventId, seatId, "SEAT_LOCKED", "LOCKED");
    }

    public void broadcastSeatAvailable(Long eventId, Long seatId) {
        sendSeat(eventId, seatId, "SEAT_AVAILABLE", "AVAILABLE");
    }

    public void broadcastSeatSold(Long eventId, Long seatId) {
        sendSeat(eventId, seatId, "SEAT_SOLD", "SOLD");
    }

    /** Dùng khi auto-release nhiều ghế cùng lúc (Scheduler) */
    public void broadcastMultipleSeatsAvailable(Long eventId, Iterable<Long> seatIds) {
        for (Long seatId : seatIds) {
            sendSeat(eventId, seatId, "SEAT_AVAILABLE", "AVAILABLE");
        }
    }

    // ── Order updates ─────────────────────────────────────────

    /**
     * Broadcast khi có đơn hàng mới (PENDING) tạo ra từ hold.
     * Admin sẽ thấy ngay đơn hàng mới xuất hiện.
     */
    public void broadcastOrderCreated(OrderUpdateMessage msg) {
        sendOrder(msg);
    }

    /**
     * Broadcast khi đơn hàng được thanh toán (PAID).
     */
    public void broadcastOrderPaid(OrderUpdateMessage msg) {
        sendOrder(msg);
    }

    /**
     * Broadcast khi đơn hàng bị hủy (CANCELLED) hoặc hết hạn (EXPIRED).
     */
    public void broadcastOrderStatusChanged(OrderUpdateMessage msg) {
        sendOrder(msg);
    }

    // ── Dashboard updates ─────────────────────────────────────

    /**
     * Broadcast summary stats của event để admin dashboard cập nhật real-time
     * (không cần chờ polling 5s).
     */
    public void broadcastDashboardUpdate(DashboardUpdateMessage msg) {
        String destination = "/topic/admin/dashboard/" + msg.getEventId();
        try {
            messagingTemplate.convertAndSend(destination, msg);
            log.debug("[WS] Dashboard update event={} sold={} locked={}",
                    msg.getEventId(), msg.getSoldSeats(), msg.getLockedSeats());
        } catch (Exception e) {
            log.warn("[WS] Failed to broadcast dashboard update event={}: {}", msg.getEventId(), e.getMessage());
        }
    }

    /**
     * Broadcast thông báo danh sách hoặc trạng thái sự kiện có thay đổi,
     * để Customer trang chủ tự cập nhật lại danh sách.
     *
     * Gửi sau khi transaction commit xong để frontend fetch được data mới nhất.
     */
    public void broadcastEventListUpdate() {
        Runnable send = () -> {
            try {
                Object payload = java.util.Map.of("type", "EVENT_LIST_UPDATED");
                messagingTemplate.convertAndSend("/topic/events", payload);
                log.debug("[WS] Broadcast event list update → /topic/events");
            } catch (Exception e) {
                log.warn("[WS] Failed to broadcast event list update: {}", e.getMessage());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    // ── Private helpers ───────────────────────────────────────

    private void sendSeat(Long eventId, Long seatId, String type, String status) {
        SeatUpdateMessage message = SeatUpdateMessage.builder()
                .type(type)
                .eventId(eventId)
                .seatId(seatId)
                .status(status)
                .build();

        // Broadcast tới frontend user
        String userDest = "/topic/seats/" + eventId;
        // Broadcast tới admin view
        String adminDest = "/topic/admin/seats/" + eventId;

        try {
            messagingTemplate.convertAndSend(userDest, message);
            messagingTemplate.convertAndSend(adminDest, message);
            log.debug("[WS] {} seat={} → {}, {}", type, seatId, userDest, adminDest);
        } catch (Exception e) {
            log.warn("[WS] Failed to broadcast {} for seat={}: {}", type, seatId, e.getMessage());
        }
    }

    private void sendOrder(OrderUpdateMessage msg) {
        // Broadcast tới topic theo eventId để admin đang xem event đó nhận được
        String eventDest = "/topic/admin/orders/" + msg.getEventId();
        // Broadcast tới global topic để admin OrderManagement (all events) nhận được
        String globalDest = "/topic/admin/orders/global";

        try {
            messagingTemplate.convertAndSend(eventDest, msg);
            messagingTemplate.convertAndSend(globalDest, msg);
            log.debug("[WS] {} order={} event={} → {}", msg.getType(), msg.getOrderId(), msg.getEventId(), eventDest);
        } catch (Exception e) {
            log.warn("[WS] Failed to broadcast order update orderId={}: {}", msg.getOrderId(), e.getMessage());
        }
    }
}
