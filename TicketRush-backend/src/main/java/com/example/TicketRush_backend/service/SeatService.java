package com.example.TicketRush_backend.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.hold.ActiveHoldResponse;
import com.example.TicketRush_backend.dto.hold.HoldResponse;
import com.example.TicketRush_backend.dto.seat.SeatMapResponse;
import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.EventSeat;
import com.example.TicketRush_backend.entity.SeatHold;
import com.example.TicketRush_backend.entity.SeatHoldItem;
import com.example.TicketRush_backend.entity.SeatZone;
import com.example.TicketRush_backend.entity.User;
import com.example.TicketRush_backend.enums.EventStatus;
import com.example.TicketRush_backend.enums.HoldStatus;
import com.example.TicketRush_backend.dto.ws.DashboardUpdateMessage;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.repository.OrderRepository;
import java.math.RoundingMode;

import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.EventRepository;
import com.example.TicketRush_backend.repository.EventSeatRepository;
import com.example.TicketRush_backend.repository.SeatHoldItemRepository;
import com.example.TicketRush_backend.repository.SeatHoldRepository;
import com.example.TicketRush_backend.repository.SeatZoneRepository;
import com.example.TicketRush_backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SeatService {

    private final EventRepository eventRepository;
    private final EventSeatRepository eventSeatRepository;
    private final SeatZoneRepository seatZoneRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final SeatHoldItemRepository seatHoldItemRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final SeatBroadcastService seatBroadcastService;

    @Value("${app.seat.hold-duration-minutes:10}")
    private int holdDurationMinutes;

    private static final int MAX_SEATS_PER_HOLD = 2;

    // ── Seat Map ───────────────────────────────────────────────

    /**
     * Trả về toàn bộ sơ đồ ghế của một event, nhóm theo zone → row → seat.
     * heldByMe = true nếu userId đang giữ ghế đó (phục vụ UI highlight).
     */
    @Transactional(readOnly = true)
    public SeatMapResponse getSeatMap(Long eventId, Long currentUserId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));

        List<EventSeat> seats = eventSeatRepository.findByEventId(eventId);
        List<SeatZone> zones = seatZoneRepository.findByEventId(eventId);

        // Nhóm seats theo zoneId → rowLabel → list seat
        Map<Long, Map<String, List<EventSeat>>> grouped = seats.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getZone().getId(),
                        Collectors.groupingBy(EventSeat::getRowLabel)
                ));

        List<SeatMapResponse.ZoneMap> zoneMaps = zones.stream()
                .map(zone -> {
                    Map<String, List<EventSeat>> rowMap =
                            grouped.getOrDefault(zone.getId(), Map.of());

                    List<EventSeat> zoneSeats = rowMap.values().stream()
                            .flatMap(List::stream)
                            .toList();

                    int totalSeats = zoneSeats.size();
                    int availableCount = (int) zoneSeats.stream()
                            .filter(s -> s.getStatus() == SeatStatus.AVAILABLE)
                            .count();
                    int lockedCount = (int) zoneSeats.stream()
                            .filter(s -> s.getStatus() == SeatStatus.LOCKED)
                            .count();
                    int soldCount = (int) zoneSeats.stream()
                            .filter(s -> s.getStatus() == SeatStatus.SOLD)
                            .count();

                    List<SeatMapResponse.RowMap> rows = rowMap.entrySet().stream()
                            .sorted(Map.Entry.comparingByKey())
                            .map(entry -> SeatMapResponse.RowMap.builder()
                                    .rowLabel(entry.getKey())
                                    .seats(entry.getValue().stream()
                                            .sorted(Comparator.comparingInt(EventSeat::getSeatNumber))
                                            .map(s -> SeatMapResponse.SeatItem.builder()
                                                    .seatId(s.getId())
                                                    .zoneId(zone.getId())
                                                    .seatNumber(s.getSeatNumber())
                                                    .rowLabel(entry.getKey())
                                                    .status(s.getStatus())
                                                    .heldByMe(currentUserId != null
                                                            && s.getHeldBy() != null
                                                            && s.getHeldBy().getId().equals(currentUserId))
                                                    .build())
                                            .toList())
                                    .build())
                            .toList();

                    return SeatMapResponse.ZoneMap.builder()
                            .zoneId(zone.getId())
                            .zoneName(zone.getName())
                            .price(zone.getPrice())
                            .colorCode(zone.getColorCode())
                            .totalSeats(totalSeats)
                            .availableCount(availableCount)
                            .lockedCount(lockedCount)
                            .soldCount(soldCount)
                            .rows(rows)
                            .build();
                })
                .toList();

        return SeatMapResponse.builder()
                .eventId(eventId)
                .zones(zoneMaps)
                .build();
    }

    // ── Hold Seat ──────────────────────────────────────────────

    /**
     * Giữ một ghế. Toàn bộ logic chạy trong DB transaction với row-level locking.
     *
     * Flow:
     * 1. Validate event ON_SALE
     * 2. SELECT FOR UPDATE trên EventSeat row
     * 3. Kiểm tra seat.status == AVAILABLE
     * 4. Kiểm tra user chưa giữ đủ 2 ghế trong event
     * 5. Tạo/cập nhật SeatHold + SeatHoldItem
     * 6. Update EventSeat → LOCKED
     */
    @Transactional
    public HoldResponse holdSeat(Long eventId, Long seatId, Long userId) {
        // 1. Validate event
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
        if (event.getStatus() != EventStatus.ON_SALE) {
            throw new AppException(ErrorCode.EVENT_NOT_ON_SALE,
                    Map.of("eventStatus", event.getStatus()));
        }

        // 2. SELECT FOR UPDATE — lock row trước khi đọc/ghi
        EventSeat seat = eventSeatRepository.findByIdForUpdate(seatId)
                .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));

        // Đảm bảo ghế thuộc event đúng
        if (!seat.getEvent().getId().equals(eventId)) {
            throw new AppException(ErrorCode.SEAT_NOT_FOUND);
        }

        // 3. Kiểm tra status (sau khi lock)
        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE,
                    Map.of("seatId", seatId));
        }

        // 4. Kiểm tra giới hạn 2 ghế (bao gồm cả ghế đang giữ và ghế đã mua trong sự kiện này)
        int currentHeldCount = eventSeatRepository.countHeldOrSoldByUserInEvent(eventId, userId);
        if (currentHeldCount >= MAX_SEATS_PER_HOLD) {
            throw new AppException(ErrorCode.SEAT_HOLD_LIMIT_EXCEEDED,
                    Map.of("currentHeldCount", currentHeldCount, "maxAllowed", MAX_SEATS_PER_HOLD));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.AUTH_USER_NOT_FOUND));

        Instant expiresAt = Instant.now().plus(holdDurationMinutes, ChronoUnit.MINUTES);

        // 5. Tìm hoặc tạo SeatHold ACTIVE cho user+event
        SeatHold hold = seatHoldRepository
                .findByUserIdAndEventIdAndStatus(userId, eventId, HoldStatus.ACTIVE)
                .orElseGet(() -> {
                    SeatHold newHold = SeatHold.builder()
                            .user(user)
                            .event(event)
                            .status(HoldStatus.ACTIVE)
                            .expiresAt(expiresAt)
                            .build();
                    return seatHoldRepository.save(newHold);
                });

        // Reset expiry trên hold (mỗi lần hold ghế mới, đồng hồ reset)
        hold.setExpiresAt(expiresAt);
        seatHoldRepository.save(hold);

        // Tạo SeatHoldItem
        BigDecimal price = seat.getZone().getPrice();
        SeatHoldItem item = SeatHoldItem.builder()
                .hold(hold)
                .seat(seat)
                .priceSnapshot(price)
                .build();
        seatHoldItemRepository.save(item);

        // 6. Update EventSeat → LOCKED
        seat.setStatus(SeatStatus.LOCKED);
        seat.setHeldBy(user);
        seat.setHeldUntil(expiresAt);
        eventSeatRepository.save(seat);

        // Flush để response đọc lại dữ liệu hold item mới nhất
        seatHoldItemRepository.flush();

        // Broadcast SEAT_LOCKED sau khi DB commit — best effort
        seatBroadcastService.broadcastSeatLocked(seat.getEvent().getId(), seatId);
        broadcastDashboardStats(eventId);

        // Build response từ DB mới nhất, không dùng hold.getItems() stale
        return buildHoldResponse(hold, seat, price);
    }

    // ── Release Seat ───────────────────────────────────────────

    /**
     * User bỏ chọn ghế thủ công. Chỉ owner của ghế mới được release.
     */
    @Transactional
        public HoldResponse releaseSeat(Long eventId, Long seatId, Long userId) {
        // SELECT FOR UPDATE để tránh race với scheduler / checkout
        EventSeat seat = eventSeatRepository.findByIdForUpdate(seatId)
                .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));

        if (!seat.getEvent().getId().equals(eventId)) {
                throw new AppException(ErrorCode.SEAT_NOT_FOUND);
        }

        if (seat.getStatus() != SeatStatus.LOCKED) {
                throw new AppException(ErrorCode.SEAT_NOT_FOUND);
        }

        if (seat.getHeldBy() == null || !seat.getHeldBy().getId().equals(userId)) {
                throw new AppException(ErrorCode.SEAT_NOT_OWNED_BY_USER);
        }

        // Tìm ACTIVE hold hiện tại của user trong event
        SeatHold hold = seatHoldRepository
                .findByUserIdAndEventIdAndStatus(userId, eventId, HoldStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.HOLD_NOT_FOUND));

        // Tìm đúng item cần release
        SeatHoldItem item = seatHoldItemRepository
                .findByHoldIdAndSeatId(hold.getId(), seatId)
                .orElseThrow(() -> new AppException(ErrorCode.HOLD_NOT_FOUND));

        // Quan trọng: remove khỏi collection đang managed để tránh hold.getItems() còn stale
        hold.getItems().removeIf(i -> i.getId() != null && i.getId().equals(item.getId()));

        // Xóa hold item khỏi DB
        seatHoldItemRepository.delete(item);
        seatHoldItemRepository.flush();

        // Release ghế
        seat.setStatus(SeatStatus.AVAILABLE);
        seat.setHeldBy(null);
        seat.setHeldUntil(null);
        eventSeatRepository.save(seat);

        // Đếm lại từ DB sau khi đã flush delete
        int remaining = seatHoldItemRepository.countByHoldId(hold.getId());

        // Nếu không còn ghế nào trong hold thì mới release toàn bộ hold
        if (remaining == 0) {
                hold.setStatus(HoldStatus.RELEASED);
                hold.setReleasedAt(Instant.now());
                seatHoldRepository.save(hold);
        }

        // Broadcast SEAT_AVAILABLE sau khi DB commit — best effort
        seatBroadcastService.broadcastSeatAvailable(seat.getEvent().getId(), seatId);
        broadcastDashboardStats(eventId);

        // Build response từ DB mới nhất
        return buildReleaseResponse(hold);
}

    // ── Active Hold ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<ActiveHoldResponse> getActiveHold(Long eventId, Long userId) {
        return seatHoldRepository
                .findByUserIdAndEventIdAndStatus(userId, eventId, HoldStatus.ACTIVE)
                .filter(h -> h.getExpiresAt().isAfter(Instant.now()))
                .map(h -> {
                    List<HoldResponse.HeldSeatDetail> seatDetails = h.getItems().stream()
                            .map(item -> HoldResponse.HeldSeatDetail.builder()
                                    .seatId(item.getSeat().getId())
                                    .zoneName(item.getSeat().getZone().getName())
                                    .rowLabel(item.getSeat().getRowLabel())
                                    .seatNumber(item.getSeat().getSeatNumber())
                                    .price(item.getPriceSnapshot())
                                    .build())
                            .toList();

                    BigDecimal total = h.getItems().stream()
                            .map(SeatHoldItem::getPriceSnapshot)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    long remaining = ChronoUnit.SECONDS.between(Instant.now(), h.getExpiresAt());

                    return ActiveHoldResponse.builder()
                            .holdId(h.getId())
                            .eventId(eventId)
                            .status(h.getStatus())
                            .expiresAt(h.getExpiresAt())
                            .remainingSeconds(Math.max(0, remaining))
                            .selectedSeats(seatDetails)
                            .totalAmount(total)
                            .build();
                });
    }

    // ── Helpers ───────────────────────────────────────────────

    private HoldResponse buildHoldResponse(SeatHold hold, EventSeat justHeld, BigDecimal price) {
        List<SeatHoldItem> items = seatHoldItemRepository.findByHoldIdOrderBySeatIdAsc(hold.getId());

        List<HoldResponse.HeldSeatDetail> allSeats = items.stream()
                .map(item -> HoldResponse.HeldSeatDetail.builder()
                        .seatId(item.getSeat().getId())
                        .zoneName(item.getSeat().getZone().getName())
                        .rowLabel(item.getSeat().getRowLabel())
                        .seatNumber(item.getSeat().getSeatNumber())
                        .price(item.getPriceSnapshot())
                        .build())
                .toList();

        BigDecimal total = items.stream()
                .map(SeatHoldItem::getPriceSnapshot)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long remainingSecs = ChronoUnit.SECONDS.between(Instant.now(), hold.getExpiresAt());

        return HoldResponse.builder()
                .holdId(hold.getId())
                .expiresAt(hold.getExpiresAt())
                .remainingSeconds(Math.max(0, remainingSecs))
                .heldSeat(HoldResponse.HeldSeatDetail.builder()
                        .seatId(justHeld.getId())
                        .zoneName(justHeld.getZone().getName())
                        .rowLabel(justHeld.getRowLabel())
                        .seatNumber(justHeld.getSeatNumber())
                        .price(price)
                        .build())
                .allSelectedSeats(allSeats)
                .totalAmount(total)
                .build();
        }

    private HoldResponse buildReleaseResponse(SeatHold hold) {
        List<SeatHoldItem> items = seatHoldItemRepository.findByHoldIdOrderBySeatIdAsc(hold.getId());

        List<HoldResponse.HeldSeatDetail> allSeats = items.stream()
                .map(item -> HoldResponse.HeldSeatDetail.builder()
                        .seatId(item.getSeat().getId())
                        .zoneName(item.getSeat().getZone().getName())
                        .rowLabel(item.getSeat().getRowLabel())
                        .seatNumber(item.getSeat().getSeatNumber())
                        .price(item.getPriceSnapshot())
                        .build())
                .toList();

        BigDecimal total = items.stream()
                .map(SeatHoldItem::getPriceSnapshot)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long remainingSecs = hold.getExpiresAt() != null
                ? ChronoUnit.SECONDS.between(Instant.now(), hold.getExpiresAt())
                : 0;

        return HoldResponse.builder()
                .holdId(hold.getId())
                .expiresAt(hold.getExpiresAt())
                .remainingSeconds(Math.max(0, remainingSecs))
                .heldSeat(null)
                .allSelectedSeats(allSeats)
                .totalAmount(total)
                .build();
        }

    private void broadcastDashboardStats(Long eventId) {
        try {
            long sold   = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.SOLD);
            long locked = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.LOCKED);
            long avail  = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
            long total  = sold + locked + avail;
            double rate = total == 0 ? 0.0 : BigDecimal.valueOf((double) sold / total * 100)
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();

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
            // log warn or ignore
        }
    }
}
