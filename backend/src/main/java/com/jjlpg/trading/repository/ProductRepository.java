package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
}
