package com.jjlpg.trading.service;
import com.jjlpg.trading.dto.UpdateStaffRequest;
import com.jjlpg.trading.entity.*;
import com.jjlpg.trading.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class StaffServiceTest {
    UserRepository users=mock(UserRepository.class);
    AuditService audit=mock(AuditService.class);
    PasswordEncoder passwords=mock(PasswordEncoder.class);
    StaffService service=new StaffService(users,passwords,audit);
    User owner(long id, boolean enabled) {
        User u=new User();u.setId(id);u.setUsername("owner-"+id);u.setRole(StaffRole.OWNER);u.setEnabled(enabled);return u;
    }
    @Test void lastActiveOwnerCannotBeDisabledOrDemoted() {
        User current=owner(1,true);
        when(users.lockOwners()).thenReturn(List.of(current,owner(2,false)));
        when(users.lockById(1L)).thenReturn(Optional.of(current));
        assertThrows(IllegalStateException.class,()->service.update(1L,new UpdateStaffRequest(StaffRole.DRIVER,true,null)));
        assertThrows(IllegalStateException.class,()->service.update(1L,new UpdateStaffRequest(StaffRole.OWNER,false,null)));
        verifyNoInteractions(audit);verify(users,never()).save(any());
    }
    @Test void passwordResetHashesPasswordAndAdvancesSessionVersionWithoutLoggingSecret() {
        User u=owner(1,true);u.setTokenVersion(4);
        when(users.lockOwners()).thenReturn(List.of(u));when(users.lockById(1L)).thenReturn(Optional.of(u));
        when(passwords.encode("replacement-password")).thenReturn("encoded-hash");when(users.save(u)).thenReturn(u);
        service.update(1L,new UpdateStaffRequest(StaffRole.OWNER,true,"replacement-password"));
        assertEquals(5,u.getTokenVersion());assertEquals("encoded-hash",u.getPasswordHash());
        verify(audit).record(eq("STAFF_UPDATED"),eq("STAFF"),eq(1L),argThat(details->details.contains("password reset")&&!details.contains("replacement-password")&&!details.contains("encoded-hash")));
    }
}
