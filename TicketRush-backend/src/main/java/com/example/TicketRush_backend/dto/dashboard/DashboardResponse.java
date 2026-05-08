package com.example.TicketRush_backend.dto.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class DashboardResponse {

    private Long eventId;
    private String eventName;
    private Summary summary;
    private List<ZoneStats> fillRateByZone;
    private List<RevenueByHour> revenueByHour;
    private List<AgeGroup> audienceByAge;
    private List<GenderGroup> audienceByGender;
    private List<RecentOrder> recentOrders;

    // ── Nested types ──────────────────────────────────────────

    @Getter @Builder
    public static class Summary {
        private long totalSeats;
        private long soldSeats;
        private long lockedSeats;
        private long availableSeats;
        private double fillRate;          // (soldSeats / totalSeats) * 100
        private BigDecimal totalRevenue;  // chỉ tính PAID orders (BR-07)
    }

    @Getter @Builder
    public static class ZoneStats {
        private Long zoneId;
        private String zoneName;
        private long totalSeats;
        private long soldSeats;
        private double fillRate;
        private BigDecimal revenue;
    }

    @Getter @Builder
    public static class RevenueByHour {
        private Instant hour;       // truncated to hour boundary
        private BigDecimal revenue;
        private long ticketsSold;
    }

    @Getter @Builder
    public static class AgeGroup {
        private String ageGroup;    // "Under 18", "18-24", "25-34", "35-44", "45+"
        private long count;
        private double percentage;
    }

    @Getter @Builder
    public static class GenderGroup {
        private String gender;      // "MALE", "FEMALE", "OTHER"
        private long count;
        private double percentage;
    }

    @Getter @Builder
    public static class RecentOrder {
        private Long orderId;
        private String orderCode;
        private String customerName;
        private String customerEmail;
        private int ticketCount;
        private BigDecimal totalAmount;
        private Instant paidAt;
    }
}
