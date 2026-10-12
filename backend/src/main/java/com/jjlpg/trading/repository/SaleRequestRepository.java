package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.SaleRequest;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface SaleRequestRepository extends JpaRepository<SaleRequest, UUID> {
    @Modifying
    @Query(value = """
            INSERT INTO public.sale_requests (request_id, request_hash)
            VALUES (:id, :hash) ON CONFLICT (request_id) DO NOTHING
            """, nativeQuery = true)
    int claim(@Param("id") UUID id, @Param("hash") String hash);
}
