package com.jjlpg.trading.controller;
import com.jjlpg.trading.dto.*;
import com.jjlpg.trading.service.StaffService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/staff")
public class StaffController {
    private final StaffService staff;
    public StaffController(StaffService staff) { this.staff = staff; }
    @GetMapping public List<StaffDto> list() { return staff.list(); }
    @PostMapping public StaffDto create(@Valid @RequestBody CreateStaffRequest request) { return staff.create(request); }
    @PutMapping("/{id}") public StaffDto update(@PathVariable Long id, @Valid @RequestBody UpdateStaffRequest request) { return staff.update(id, request); }
}
