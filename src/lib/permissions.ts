import type { StaffRole } from "@/lib/api"
export function homeForRole(role: StaffRole | null) { return role === "OWNER" ? "/dashboard" : role === "CASHIER" ? "/sales" : "/loans" }
export function canVisit(role: StaffRole | null, path: string) {
  if (!role) return false
  if (role === "OWNER") return true
  return ["/inventory", "/loans", ...(role === "CASHIER" ? ["/sales", "/tank-exchanges"] : [])].includes(path)
}
