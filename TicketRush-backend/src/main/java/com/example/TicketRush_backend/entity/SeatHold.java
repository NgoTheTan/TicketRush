package com.example.TicketRush_backend.entity;

import com.example.TicketRush_backend.enums.HoldStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "seat_holds",
        indexes = {
                @Index(name = "idx_holds_user_event_status",
                        columnList = "user_id, event_id, status"),
                @Index(name = "idx_holds_expires_status",
                        columnList = "expires_at, status")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SeatHold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    // Dùng STRING thay vì NAMED_ENUM để tương thích với ddl-auto=update
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private HoldStatus status = HoldStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "held_at", nullable = false, updatable = false)
    private Instant heldAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Column(name = "converted_at")
    private Instant convertedAt;

    @OneToMany(mappedBy = "hold", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @Builder.Default
    private List<SeatHoldItem> items = new ArrayList<>();
}
