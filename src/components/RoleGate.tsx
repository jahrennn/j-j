import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { canVisit } from "@/lib/permissions"
export function RoleGate({ children }: { children: ReactNode }) {
  const { role, homePath } = useAuth()
  const { pathname } = useLocation()
  return canVisit(role, pathname) ? <>{children}</> : <Navigate to={homePath} replace />
}
