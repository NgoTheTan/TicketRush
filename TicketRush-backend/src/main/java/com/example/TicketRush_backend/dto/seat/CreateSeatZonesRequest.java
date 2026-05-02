package com.example.TicketRush_backend.dto.seat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateSeatZonesRequest {

    @NotEmpty(message = "Phải có ít nhất một khu vực ghế")
    @Valid
    private List<ZoneConfig> zones;

    @Data
    public static class ZoneConfig {

        @NotBlank(message = "Tên khu vực không được để trống")
        @Size(max = 100)
        private String name;

        @NotNull(message = "Giá không được để trống")
        @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        private BigDecimal price;

        @NotNull @Min(value = 1, message = "Số hàng phải ít nhất 1")
        private Integer totalRows;

        @NotNull @Min(value = 1, message = "Số ghế mỗi hàng phải ít nhất 1")
        private Integer seatsPerRow;

        @Size(max = 7)
        private String colorCode;
    }
}
