package com.example.TicketRush_backend.dto.event;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.Instant;

@Data
public class UpdateEventRequest {

    @Size(min = 2, max = 500)
    private String name;

    @Size(max = 5000)
    private String description;

    @Size(min = 2, max = 500)
    private String venue;

    private Instant eventDate;

    @Size(max = 1000)
    private String imageUrl;
}
