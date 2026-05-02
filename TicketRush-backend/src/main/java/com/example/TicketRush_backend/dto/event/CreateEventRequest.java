package com.example.TicketRush_backend.dto.event;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.Instant;

@Data
public class CreateEventRequest {

    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(min = 2, max = 500)
    private String name;

    @Size(max = 5000)
    private String description;

    @NotBlank(message = "Địa điểm không được để trống")
    @Size(min = 2, max = 500)
    private String venue;

    @NotNull(message = "Ngày tổ chức không được để trống")
    @Future(message = "Ngày tổ chức phải trong tương lai")
    private Instant eventDate;

    @Size(max = 1000)
    private String imageUrl;
}
