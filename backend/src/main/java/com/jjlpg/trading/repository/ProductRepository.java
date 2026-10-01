package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT e FROM Product e WHERE e.id = :id")
    java.util.Optional<Product> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

}
