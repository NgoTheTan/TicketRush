package com.example.TicketRush_backend.dto.event;

import com.example.TicketRush_backend.dto.seat.CreateSeatZonesRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateEventWithSeatZonesRequest {

    @NotNull(message = "Thông tin sự kiện không được để trống")
    @Valid
    private CreateEventRequest event;

    @NotEmpty(message = "Phải có ít nhất một khu vực ghế")
    @Valid
    private List<CreateSeatZonesRequest.ZoneConfig> zones;
}
