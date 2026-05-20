package com.example.TicketRush_backend.dto.event;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.Instant;

@Data
public class UpdateEventRequest {
    private static final String CATEGORY_PATTERN =
            "Ca nhạc|Sân khấu & Nghệ thuật|Thể thao|Hội thảo & Workshop|Tham quan & Trải nghiệm|Khác";

    @Size(min = 2, max = 500)
    private String name;

    @Size(max = 5000)
    private String description;

    @Pattern(regexp = CATEGORY_PATTERN, message = "Thể loại không hợp lệ")
    private String category;

    @Size(min = 2, max = 500)
    private String venue;

    @Size(min = 2, max = 255)
    private String city;

    private Instant eventDate;

    @Size(max = 1000)
    private String imageUrl;

    @Size(max = 1000)
    private String locationUrl;
}
