package com.example.TicketRush_backend.repository;

import com.example.TicketRush_backend.entity.SeatHoldItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SeatHoldItemRepository extends JpaRepository<SeatHoldItem, Long> {

    /**
     * Tìm hold item theo holdId + seatId để release ghế cụ thể.
     */
    Optional<SeatHoldItem> findByHoldIdAndSeatId(Long holdId, Long seatId);

    /**
     * Đếm số ghế đang hold trong một hold session (giới hạn tối đa 2).
     */
    @Query("SELECT COUNT(i) FROM SeatHoldItem i WHERE i.hold.id = :holdId")
    int countByHoldId(@Param("holdId") Long holdId);
}
