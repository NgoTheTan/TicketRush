package com.example.TicketRush_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "seat_hold_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_hold_item_seat",
                columnNames = {"hold_id", "seat_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SeatHoldItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hold_id", nullable = false)
    private SeatHold hold;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private EventSeat seat;

    // Snapshot giá zone tại thời điểm hold
    @Column(name = "price_snapshot", nullable = false, precision = 15, scale = 2)
    private BigDecimal priceSnapshot;
}
