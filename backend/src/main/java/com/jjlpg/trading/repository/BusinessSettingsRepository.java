package com.jjlpg.trading.repository;

import com.jjlpg.trading.entity.BusinessSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessSettingsRepository extends JpaRepository<BusinessSettings, Short> {
}
