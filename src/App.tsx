import { Routes, Route, Navigate } from "react-router-dom"
import { RoleGate } from "@/components/RoleGate"
import { StaffPage } from "@/pages/StaffPage"
import { ActivityPage } from "@/pages/ActivityPage"
import { AuthProvider } from "@/lib/auth"
import { AppLayout } from "@/components/AppLayout"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { SalesPage } from "@/pages/SalesPage"
import { InventoryPage } from "@/pages/InventoryPage"
import { LoanTrackerPage } from "@/pages/LoanTrackerPage"
import { TankExchangePage } from "@/pages/TankExchangePage"
import { SettingsPage } from "@/pages/SettingsPage"
import { ExpensesPage } from "@/pages/ExpensesPage"

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<RoleGate><DashboardPage /></RoleGate>} />
          <Route path="/sales" element={<RoleGate><SalesPage /></RoleGate>} />
          <Route path="/inventory" element={<RoleGate><InventoryPage /></RoleGate>} />
          <Route path="/tank-exchanges" element={<RoleGate><TankExchangePage /></RoleGate>} />
          <Route path="/loans" element={<RoleGate><LoanTrackerPage /></RoleGate>} />
          <Route path="/expenses" element={<RoleGate><ExpensesPage /></RoleGate>} />
          <Route path="/staff" element={<RoleGate><StaffPage /></RoleGate>} />
          <Route path="/activity" element={<RoleGate><ActivityPage /></RoleGate>} />
          <Route path="/settings" element={<RoleGate><SettingsPage /></RoleGate>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
