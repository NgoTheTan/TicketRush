package com.example.TicketRush_backend.entity;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.example.TicketRush_backend.enums.QueueStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * QueueSession — Sprint 3: Virtual Waiting Room
 * Mỗi user+event chỉ có 1 session WAITING tại một thời điểm.
 * Dùng VARCHAR cho status (không dùng NAMED_ENUM để tránh cần PG enum type mới).
 */
@Entity
@Table(name = "queue_sessions",
        indexes = {
                @Index(name = "idx_queue_event_status_pos",
                        columnList = "event_id, status, position"),
                @Index(name = "idx_queue_token",
                        columnList = "queue_token"),
                @Index(name = "idx_queue_admitted_exp",
                        columnList = "status, access_expires_at")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QueueSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /** UUID token — dùng để client polling, không dùng JWT */
    @Column(name = "queue_token", nullable = false, unique = true, updatable = false)
    @Builder.Default
    private UUID queueToken = UUID.randomUUID();

    @Column(name = "position", nullable = false)
    private Integer position;

    /**
     * Dùng @Enumerated(STRING) + VARCHAR — tránh cần PG ENUM type mới,
     * tương thích với ddl-auto=validate nếu bảng được tạo bằng migration SQL.
     */
//     @Enumerated(EnumType.STRING)
//     @Column(nullable = false, length = 20)
//     @Builder.Default
//     private QueueStatus status = QueueStatus.WAITING;


        /**
         * DB hiện tại đang dùng PostgreSQL native enum type: queue_status.
         * Vì vậy phải dùng NAMED_ENUM, nếu không Hibernate sẽ bind tham số như VARCHAR
         * và PostgreSQL sẽ báo lỗi: queue_status = character varying.
         */
        @Enumerated(EnumType.STRING)
        @JdbcTypeCode(SqlTypes.NAMED_ENUM)
        @Column(name = "status", nullable = false, columnDefinition = "queue_status")
        @Builder.Default
        private QueueStatus status = QueueStatus.WAITING;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @Column(name = "admitted_at")
    private Instant admittedAt;

    /** Token có hiệu lực trong N phút sau khi ADMITTED */
    @Column(name = "access_expires_at")
    private Instant accessExpiresAt;
}
