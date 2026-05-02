package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.Order;
import com.example.TicketRush_backend.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(Long userId, Pageable pageable);

    Optional<Order> findByIdAndUserId(Long id, Long userId);

    /**
     * Tìm Order theo holdId — dùng trong checkout confirm flow.
     */
    Optional<Order> findByHoldId(Long holdId);

    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.event.id = :eventId")
    Page<Order> findByStatusAndEventId(@Param("status") OrderStatus status,
                                       @Param("eventId") Long eventId,
                                       Pageable pageable);

    @Query("""
        SELECT o FROM Order o
        WHERE (:search IS NULL OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:status IS NULL OR o.status = :status)
          AND (:eventId IS NULL OR o.event.id = :eventId)
    """)
    Page<Order> findByFilters(@Param("search")  String search,
                              @Param("status")  OrderStatus status,
                              @Param("eventId") Long eventId,
                              Pageable pageable);
}
