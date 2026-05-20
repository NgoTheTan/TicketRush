package com.example.TicketRush_backend.dto.event;

import com.example.TicketRush_backend.entity.Event;
import com.example.TicketRush_backend.entity.SeatZone;
import com.example.TicketRush_backend.enums.EventStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class EventResponse {
    private Long id;
    private String name;
    private String description;
    private String category;
    private String venue;
    private String city;
    private Instant eventDate;
    private String imageUrl;
    private String locationUrl;
    private EventStatus status;
    private Instant createdAt;

    // Enriched fields (populated by service layer)
    private Long totalSeats;
    private Long availableSeats;
    private Long soldSeats;
    private Long lockedSeats;
    private BigDecimal priceFrom;
    private List<ZoneSummary> zones;

    @Data @Builder
    public static class ZoneSummary {
        private Long id;
        private String name;
        private BigDecimal price;
        private String colorCode;
        private Integer totalSeats;
        private Long availableSeats;
        private Long soldSeats;

        public static ZoneSummary from(SeatZone z, long total, long available, long sold) {
            return ZoneSummary.builder()
                    .id(z.getId())
                    .name(z.getName())
                    .price(z.getPrice())
                    .colorCode(z.getColorCode())
                    .totalSeats((int) total)
                    .availableSeats(available)
                    .soldSeats(sold)
                    .build();
        }
    }

    public static EventResponse basic(Event e) {
        return EventResponse.builder()
                .id(e.getId())
                .name(e.getName())
                .description(e.getDescription())
                .category(e.getCategory())
                .venue(e.getVenue())
                .city(e.getCity())
                .eventDate(e.getEventDate())
                .imageUrl(e.getImageUrl())
                .locationUrl(e.getLocationUrl())
                .status(e.getStatus())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
