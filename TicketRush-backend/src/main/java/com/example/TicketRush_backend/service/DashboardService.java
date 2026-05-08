package com.example.TicketRush_backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.TicketRush_backend.common.AppException;
import com.example.TicketRush_backend.common.ErrorCode;
import com.example.TicketRush_backend.dto.dashboard.DashboardResponse;
import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.entity.SeatZone;
import com.example.TicketRush_backend.enums.OrderStatus;
import com.example.TicketRush_backend.enums.SeatStatus;
import com.example.TicketRush_backend.repository.CustomerProfileRepository;
import com.example.TicketRush_backend.repository.EventRepository;
import com.example.TicketRush_backend.repository.EventSeatRepository;
import com.example.TicketRush_backend.repository.OrderRepository;
import com.example.TicketRush_backend.repository.SeatZoneRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EventRepository           eventRepository;
    private final EventSeatRepository       eventSeatRepository;
    private final SeatZoneRepository        seatZoneRepository;
    private final OrderRepository           orderRepository;
    private final CustomerProfileRepository customerProfileRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));

        // ── 1. Summary stats ──────────────────────────────────
        long soldSeats   = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.SOLD);
        long lockedSeats = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.LOCKED);
        long availSeats  = eventSeatRepository.countByEventIdAndStatus(eventId, SeatStatus.AVAILABLE);
        long totalSeats  = soldSeats + lockedSeats + availSeats;

        double fillRate = totalSeats == 0 ? 0.0
                : round2((double) soldSeats / totalSeats * 100);

        BigDecimal totalRevenue = orderRepository.sumRevenueByEventId(eventId, OrderStatus.PAID);

        DashboardResponse.Summary summary = DashboardResponse.Summary.builder()
                .totalSeats(totalSeats)
                .soldSeats(soldSeats)
                .lockedSeats(lockedSeats)
                .availableSeats(availSeats)
                .fillRate(fillRate)
                .totalRevenue(totalRevenue)
                .build();

        // ── 2. Fill rate by zone ──────────────────────────────
        List<SeatZone> zones = seatZoneRepository.findByEventId(eventId);
        Map<Long, SeatZone> zoneMap = zones.stream()
                .collect(Collectors.toMap(SeatZone::getId, z -> z));

        // Map zoneId → {soldCount, revenue}
        Map<Long, long[]> zoneSoldMap = new HashMap<>();
        Map<Long, BigDecimal> zoneRevenueMap = new HashMap<>();

        for (Object[] row : eventSeatRepository.findSoldStatsByZone(eventId)) {
            Long zoneId  = ((Number) row[0]).longValue();
            long sold    = ((Number) row[1]).longValue();
            BigDecimal rev = row[2] != null
                    ? new BigDecimal(row[2].toString())
                    : BigDecimal.ZERO;
            zoneSoldMap.put(zoneId, new long[]{sold});
            zoneRevenueMap.put(zoneId, rev);
        }

        List<DashboardResponse.ZoneStats> fillRateByZone = zones.stream().map(z -> {
            long zoneSold  = zoneSoldMap.containsKey(z.getId()) ? zoneSoldMap.get(z.getId())[0] : 0;
            long zoneTotal = (long) z.getTotalRows() * z.getSeatsPerRow();
            double zoneRate = zoneTotal == 0 ? 0.0 : round2((double) zoneSold / zoneTotal * 100);
            return DashboardResponse.ZoneStats.builder()
                    .zoneId(z.getId())
                    .zoneName(z.getName())
                    .totalSeats(zoneTotal)
                    .soldSeats(zoneSold)
                    .fillRate(zoneRate)
                    .revenue(zoneRevenueMap.getOrDefault(z.getId(), BigDecimal.ZERO))
                    .build();
        }).toList();

        // ── 3. Revenue by hour ────────────────────────────────
        List<DashboardResponse.RevenueByHour> revenueByHour = new ArrayList<>();
        for (Object[] row : orderRepository.findRevenueByHour(eventId)) {
            Instant hour = toInstant(row[0]);
            BigDecimal rev  = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            long tickets    = row[2] != null ? ((Number) row[2]).longValue() : 0;
            revenueByHour.add(DashboardResponse.RevenueByHour.builder()
                    .hour(hour).revenue(rev).ticketsSold(tickets).build());
        }

        // ── 4. Audience by age ────────────────────────────────
        List<Object[]> ageRows = customerProfileRepository.findAudienceByAgeGroup(eventId);
        long totalAudience = ageRows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();

        List<DashboardResponse.AgeGroup> audienceByAge = ageRows.stream().map(row -> {
            String ageGroup = (String) row[0];
            long count      = ((Number) row[1]).longValue();
            double pct      = totalAudience == 0 ? 0.0 : round2((double) count / totalAudience * 100);
            return DashboardResponse.AgeGroup.builder()
                    .ageGroup(ageGroup).count(count).percentage(pct).build();
        }).toList();

        // ── 5. Audience by gender ─────────────────────────────
        List<Object[]> genderRows = customerProfileRepository.findAudienceByGender(eventId);
        long totalGender = genderRows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();

        List<DashboardResponse.GenderGroup> audienceByGender = genderRows.stream().map(row -> {
            String gender = (String) row[0];
            long count    = ((Number) row[1]).longValue();
            double pct    = totalGender == 0 ? 0.0 : round2((double) count / totalGender * 100);
            return DashboardResponse.GenderGroup.builder()
                    .gender(gender).count(count).percentage(pct).build();
        }).toList();

        // ── 6. Recent orders (top 10 PAID) ────────────────────
        List<DashboardResponse.RecentOrder> recentOrders =
                orderRepository.findRecentPaidOrders(eventId, OrderStatus.PAID, PageRequest.of(0, 10))
                        .stream()
                        .map(this::toRecentOrder)
                        .toList();

        return DashboardResponse.builder()
                .eventId(eventId)
                .eventName(event.getName())
                .summary(summary)
                .fillRateByZone(fillRateByZone)
                .revenueByHour(revenueByHour)
                .audienceByAge(audienceByAge)
                .audienceByGender(audienceByGender)
                .recentOrders(recentOrders)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────

    private DashboardResponse.RecentOrder toRecentOrder(Order o) {
        return DashboardResponse.RecentOrder.builder()
                .orderId(o.getId())
                .orderCode(o.getOrderCode())
                .customerName(o.getUser().getFullName())
                .customerEmail(o.getUser().getEmail())
                .ticketCount(o.getItems().size())
                .totalAmount(o.getTotalAmount())
                .paidAt(o.getPaidAt())
                .build();
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    
    private Instant toInstant(Object value) {
        if (value == null) {
                return Instant.now();
        }

        if (value instanceof Instant instant) {
                return instant;
        }

        if (value instanceof Timestamp timestamp) {
                return timestamp.toInstant();
        }

        if (value instanceof LocalDateTime localDateTime) {
                return localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        }

        throw new IllegalArgumentException(
                "Unsupported datetime type from revenue query: " + value.getClass().getName()
        );
        }
        
}
