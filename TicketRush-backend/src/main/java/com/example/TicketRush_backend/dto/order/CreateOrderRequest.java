package com.example.TicketRush_backend.dto.order;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateOrderRequest {

    @NotNull(message = "holdId không được để trống")
    private Long holdId;
}
