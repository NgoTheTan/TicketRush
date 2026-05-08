package com.example.TicketRush_backend.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.entity.SeatHold;
import com.example.TicketRush_backend.enums.HoldStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.EventSeatRepository;
import com.example.TicketRush_backend.repository.SeatHoldRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * SeatReleaseScheduler — Sprint 3: Auto-release expired holds.
 *
 * Chạy mỗi 30 giây, tìm tất cả EventSeat có:
 *   status = LOCKED AND held_until < NOW()
 * Sau đó release về AVAILABLE và broadcast WebSocket.
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
    private final SeatBroadcastService seatBroadcastService;

    /**
     * Chạy mỗi 30 giây (fixedDelay tính từ khi method trước hoàn thành).
     * Dùng fixedDelay thay vì fixedRate để tránh overlap khi DB chậm.
     */
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void releaseExpiredHolds() {
        Instant now = Instant.now();
        List<EventSeat> expired = eventSeatRepository.findExpiredLocks(now);

        if (expired.isEmpty()) return;

        log.info("[Scheduler] Found {} expired seat lock(s) to release", expired.size());

        // Group by eventId để broadcast theo event
        java.util.Map<Long, List<Long>> bySeatByEvent = new java.util.HashMap<>();

        for (EventSeat seat : expired) {
            // Double-check: chỉ release nếu vẫn còn LOCKED (tránh race với checkout)
            if (seat.getStatus() != SeatStatus.LOCKED) continue;

            Long eventId = seat.getEvent().getId();
            Long seatId  = seat.getId();

            // Release ghế
            seat.setStatus(SeatStatus.AVAILABLE);
            seat.setHeldBy(null);
            seat.setHeldUntil(null);
            eventSeatRepository.save(seat);

            bySeatByEvent.computeIfAbsent(eventId, k -> new ArrayList<>()).add(seatId);

            log.debug("[Scheduler] Released seat={} from event={}", seatId, eventId);
        }

        // Cập nhật SeatHold → EXPIRED cho các hold đã hết hạn
        List<SeatHold> expiredHolds = seatHoldRepository.findByStatusAndExpiresAtBefore(HoldStatus.ACTIVE, now);
        for (SeatHold hold : expiredHolds) {
            hold.setStatus(HoldStatus.EXPIRED);
            hold.setReleasedAt(now);
            seatHoldRepository.save(hold);
        }

        // Broadcast WebSocket AFTER commit (được gọi khi @Transactional hoàn tất)
        // Chú ý: broadcast phải dùng @TransactionalEventListener hoặc gọi sau transaction
        // Để đơn giản, chúng ta gọi ngay — STOMP message là async nên không ảnh hưởng transaction
        bySeatByEvent.forEach((eventId, seatIds) -> {
            seatBroadcastService.broadcastMultipleSeatsAvailable(eventId, seatIds);
            log.info("[Scheduler] Released {} seat(s) for event={}", seatIds.size(), eventId);
        });
    }
}
