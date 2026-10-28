import { PrivacyToggle } from "@/components/PrivacyToggle"
import { usePrivacy, PRIVACY_MASK } from "@/lib/privacy"
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type LabelHTMLAttributes,
} from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "destructive"
type ButtonSize = "sm" | "md" | "icon"

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
  outline:
    "border border-input bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-10 w-10",
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
  }
>(({ className, variant = "primary", size = "md", ...props }, ref) => {
  const { privacyEnabled } = usePrivacy()
  return <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    {...props}
    disabled={props.disabled || (privacyEnabled && props.type === "submit")}
    title={privacyEnabled && props.type === "submit" ? "Reveal sensitive details to save changes" : props.title}
  />
})
Button.displayName = "Button"

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const { privacyEnabled } = usePrivacy()
  const monetary = /amount|price|capital|downpayment/i.test(`${props.name ?? ""} ${props.id ?? ""}`)
  const masked = privacyEnabled && (monetary || !["number", "date", "checkbox", "radio"].includes(props.type ?? "text"))
  const styles = cn("h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50", className)
  return <span className="block">
    <input ref={ref} {...props} className={styles} hidden={masked || props.hidden} disabled={props.disabled || masked} aria-hidden={masked || undefined} title={masked ? undefined : props.title} />
    {masked && <span role="textbox" aria-label={props["aria-label"] ?? "Hidden field"} aria-readonly="true" className={cn(styles, "flex items-center tracking-widest")}>{PRIVACY_MASK}</span>}
  </span>
})
Input.displayName = "Input"

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  )
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  )
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  const { privacyEnabled } = usePrivacy()
  const masked = privacyEnabled && /productId|receipt-sale/.test(`${props.name ?? ""} ${props.id ?? ""}`)
  return <span className="block w-full">
    <select ref={ref} {...props} hidden={masked} disabled={props.disabled || masked} aria-hidden={masked || undefined}
      className={cn("h-10 w-full appearance-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:opacity-50", className)} />
    {masked && <span className="flex h-10 items-center rounded-lg border border-input bg-card px-3 text-sm tracking-widest">{PRIVACY_MASK}</span>}
  </span>
})
Select.displayName = "Select"

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const { privacyEnabled } = usePrivacy()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-4">
        <Card role="dialog" aria-modal="true" aria-label={title} className="relative w-full shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <div className="flex items-center gap-2"><PrivacyToggle />
            <button
              aria-label="Close dialog"
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button></div>
          </div>
          <div className="p-5">{privacyEnabled && <p role="status" className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">Demo privacy is on. Sensitive values are hidden and saving is paused. Reveal details using the eye button to edit.</p>}{children}</div>
        </Card>
      </div>
    </div>
  )
}

