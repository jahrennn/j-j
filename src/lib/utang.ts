import type { LoanRecord } from "@/lib/api"
import { formatCurrency, formatDate, philippineToday } from "@/lib/utils"

export type DueFilter = "ALL" | "OVERDUE" | "TODAY" | "UPCOMING" | "UNDATED"
export function dueStatus(loan: LoanRecord, today = philippineToday()): DueFilter | "PAID" {
  if (loan.status === "PAID" || loan.remainingBalance <= 0) return "PAID"
  if (!loan.dueDate) return "UNDATED"
  return loan.dueDate < today ? "OVERDUE" : loan.dueDate === today ? "TODAY" : "UPCOMING"
}
export function daysOverdue(loan: LoanRecord, today = philippineToday()) {
  return dueStatus(loan, today) === "OVERDUE"
    ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${loan.dueDate}T00:00:00Z`)) / 86400000) : 0
}
export function reminderMessage(loan: LoanRecord, businessName: string, contactNumber?: string, today = philippineToday()) {
  if (dueStatus(loan, today) === "PAID") return ""
  const due = !loan.dueDate ? "Please let us know your promised payment date."
    : loan.dueDate < today ? `Your promised payment date was ${formatDate(loan.dueDate)} (${daysOverdue(loan, today)} day(s) overdue).`
    : loan.dueDate === today ? "Your promised payment date is today."
    : `Your promised payment date is ${formatDate(loan.dueDate)}.`
  return `Hello ${loan.borrowerName}, this is a friendly reminder from ${businessName} about your remaining utang balance of ${formatCurrency(loan.remainingBalance)} for your ${loan.category === "LPG" ? "LPG purchase" : "loan"} dated ${formatDate(loan.loanDate)} (reference: UTANG-${loan.id}). ${due} If you have already paid, please share your payment details so we can update our records. Thank you!${contactNumber ? ` For questions, contact ${contactNumber}.` : ""}`
}
