import { usePrivacy } from "@/lib/privacy"
import { Cylinder } from "lucide-react"
import { BRAND_LOGO_URL, BRAND_MARK_URL, BRAND_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

export function BrandLogo({ variant = "mark", className, decorative = false }: {
  variant?: "mark" | "full"
  className?: string
  decorative?: boolean
}) {
  const { privacyEnabled } = usePrivacy()
  if (privacyEnabled) return <Cylinder role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Business demo"} className={cn("shrink-0 text-primary", className)} />
  return (
    <img
      src={variant === "full" ? BRAND_LOGO_URL : BRAND_MARK_URL}
      alt={decorative ? "" : BRAND_NAME}
      width={1254}
      height={1254}
      decoding="async"
      className={cn("shrink-0 object-contain", className)}
    />
  )
}
