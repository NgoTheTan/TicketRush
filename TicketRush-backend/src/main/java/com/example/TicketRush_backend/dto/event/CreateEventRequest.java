package com.example.TicketRush_backend.dto.event;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.Instant;

@Data
public class CreateEventRequest {
    private static final String CATEGORY_PATTERN =
            "Ca nhạc|Sân khấu & Nghệ thuật|Thể thao|Hội thảo & Workshop|Tham quan & Trải nghiệm|Khác";

    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(min = 2, max = 500)
    private String name;

    @Size(max = 5000)
    private String description;

    @NotBlank(message = "Thể loại không được để trống")
    @Pattern(regexp = CATEGORY_PATTERN, message = "Thể loại không hợp lệ")
    private String category;

    @NotBlank(message = "Địa điểm không được để trống")
    @Size(min = 2, max = 500)
    private String venue;

    @NotBlank(message = "Thành phố không được để trống")
    @Size(min = 2, max = 255)
    private String city;

    @NotNull(message = "Ngày tổ chức không được để trống")
    @Future(message = "Ngày tổ chức phải trong tương lai")
    private Instant eventDate;

    @Size(max = 1000)
    private String imageUrl;

    @Size(max = 1000)
    private String locationUrl;
}
