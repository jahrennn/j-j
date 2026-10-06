package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.TankExchange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TankExchangeRepository extends JpaRepository<TankExchange, Long> {
    @EntityGraph(attributePaths = "sale")
    Page<TankExchange> findAll(Pageable pageable);
    Optional<TankExchange> findBySaleId(Long saleId);
}
