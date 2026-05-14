package com.example.TicketRush_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private EventSeat seat;

    @Column(name = "zone_name", nullable = false, length = 100)
    private String zoneName;

    @Column(name = "row_label", nullable = false, length = 10)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @OneToOne(mappedBy = "orderItem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Ticket ticket;
}
