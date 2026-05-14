package com.example.TicketRush_backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.TicketRush_backend.dto.ws.DashboardUpdateMessage;
import com.example.TicketRush_backend.dto.ws.OrderUpdateMessage;
import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.entity.SeatHold;
import com.example.TicketRush_backend.enums.HoldStatus;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.EventSeatRepository;
import com.example.TicketRush_backend.repository.OrderRepository;
import com.example.TicketRush_backend.repository.SeatHoldRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * SeatReleaseScheduler — Auto-release expired holds và expire orders.
 *
 * Chạy mỗi 30 giây, tìm tất cả EventSeat có:
 *   status = LOCKED AND held_until < NOW()
 * Sau đó release về AVAILABLE và broadcast WebSocket.
 *
 * Đồng thời expire các Order PENDING có expiresAt < NOW().
 *
 * Business rule BR-04: Ghế locked có thời hạn 10 phút kể từ thời điểm hold.
 */
@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class SeatReleaseScheduler {

    private final EventSeatRepository eventSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final OrderRepository orderRepository;
    private final SeatBroadcastService seatBroadcastService;

    /**
     * Chạy mỗi 30 giây (fixedDelay tính từ khi method trước hoàn thành).
     * Dùng fixedDelay thay vì fixedRate để tránh overlap khi DB chậm.
     */
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void releaseExpiredHolds() {
        Instant now = Instant.now();

        // ── 1. Release expired seat locks ─────────────────────
        List<EventSeat> expired = eventSeatRepository.findExpiredLocks(now);

        Map<Long, List<Long>> seatsByEvent = new HashMap<>();

        if (!expired.isEmpty()) {
            log.info("[Scheduler] Found {} expired seat lock(s) to release", expired.size());

            for (EventSeat seat : expired) {
                if (seat.getStatus() != SeatStatus.LOCKED) continue;

                Long eventId = seat.getEvent().getId();
                Long seatId  = seat.getId();

                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setHeldBy(null);
                seat.setHeldUntil(null);
                eventSeatRepository.save(seat);

                seatsByEvent.computeIfAbsent(eventId, k -> new ArrayList<>()).add(seatId);
                log.debug("[Scheduler] Released seat={} from event={}", seatId, eventId);
            }
        }

        // ── 2. Expire active holds ─────────────────────────────
        List<SeatHold> expiredHolds = seatHoldRepository.findByStatusAndExpiresAtBefore(HoldStatus.ACTIVE, now);
        for (SeatHold hold : expiredHolds) {
            hold.setStatus(HoldStatus.EXPIRED);
            hold.setReleasedAt(now);
            seatHoldRepository.save(hold);
            log.debug("[Scheduler] Expired hold={}", hold.getId());
        }

        // ── 3. Expire PENDING orders whose hold has expired ────
        // Tìm các Order PENDING có expiresAt < NOW (đồng hồ của hold)
        List<Order> pendingExpired = orderRepository.findExpiredPendingOrders(OrderStatus.PENDING, now);
        Map<Long, List<Order>> expiredOrdersByEvent = new HashMap<>();

        for (Order order : pendingExpired) {
            order.setStatus(OrderStatus.EXPIRED);
            orderRepository.save(order);
            Long eventId = order.getEvent().getId();
            expiredOrdersByEvent.computeIfAbsent(eventId, k -> new ArrayList<>()).add(order);
            log.debug("[Scheduler] Expired order={} event={}", order.getId(), eventId);
        }

        if (!pendingExpired.isEmpty()) {
            log.info("[Scheduler] Expired {} pending order(s)", pendingExpired.size());
        }

        // ── 4. Broadcast WS after all DB changes ──────────────
        // Broadcast seat-available per event
        seatsByEvent.forEach((eventId, seatIds) -> {
            seatBroadcastService.broadcastMultipleSeatsAvailable(eventId, seatIds);
            log.info("[Scheduler] Released {} seat(s) for event={}", seatIds.size(), eventId);
        });

        // Broadcast order expired per event
        expiredOrdersByEvent.forEach((eventId, orders) -> {
            for (Order order : orders) {
                seatBroadcastService.broadcastOrderStatusChanged(
                        OrderUpdateMessage.builder()
                                .type("ORDER_EXPIRED")
                                .orderId(order.getId())
                                .orderCode(order.getOrderCode())
                                .eventId(eventId)
                                .eventName(order.getEvent().getName())
                                .status(OrderStatus.EXPIRED.name())
                                .totalAmount(order.getTotalAmount())
                                .customerName(order.getUser() != null ? order.getUser().getFullName() : null)
                                .customerEmail(order.getUser() != null ? order.getUser().getEmail() : null)
                                .ticketCount(order.getItems() != null ? order.getItems().size() : 0)
                                .build()
                );
            }
        });

        // Broadcast dashboard stats cho tất cả event bị ảnh hưởng
        // (union của seatsByEvent và expiredOrdersByEvent keys)
        java.util.Set<Long> affectedEvents = new java.util.HashSet<>();
        affectedEvents.addAll(seatsByEvent.keySet());
        affectedEvents.addAll(expiredOrdersByEvent.keySet());

        for (Long eventId : affectedEvents) {
            broadcastDashboardStats(eventId);
        }
    }


    private void broadcastDashboardStats(Long eventId) {
        try {
            long sold   = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.SOLD);
            long locked = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.LOCKED);
            long avail  = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
            long total  = sold + locked + avail;
            double rate = total == 0 ? 0.0 : roundRate((double) sold / total * 100);

            BigDecimal revenue = orderRepository.sumRevenueByEventId(eventId, OrderStatus.PAID);

            seatBroadcastService.broadcastDashboardUpdate(
                    DashboardUpdateMessage.builder()
                            .eventId(eventId)
                            .soldSeats(sold)
                            .lockedSeats(locked)
                            .availableSeats(avail)
                            .totalSeats(total)
                            .fillRate(rate)
                            .totalRevenue(revenue)
                            .pendingOrders(0L)
                            .build()
            );
        } catch (Exception e) {
            log.warn("[Scheduler] Failed to broadcast dashboard for event={}: {}", eventId, e.getMessage());
        }
    }

    private double roundRate(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
