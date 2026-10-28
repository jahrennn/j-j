import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { test } from 'node:test'

const utils = {
  philippineToday: () => '2026-10-29',
  formatCurrency: n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n),
  formatDate: s => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(s)),
}
const module = { exports: {} }
const output = ts.transpileModule(readFileSync(new URL('../src/lib/utang.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
vm.runInNewContext(output, { exports: module.exports, require: () => utils, Date })
const { dueStatus, daysOverdue, reminderMessage } = module.exports
const loan = { id: 17, borrowerName: 'Maria', category: 'LPG', loanDate: '2026-10-20', dueDate: '2026-10-28', totalAmount: 1000, amountPaid: 400, remainingBalance: 600, status: 'PARTIALLY_PAID' }

test('overdue means outstanding and before today; today, future, undated and paid stay separate', () => {
  assert.equal(dueStatus(loan), 'OVERDUE')
  assert.equal(daysOverdue(loan), 1)
  assert.equal(dueStatus({ ...loan, dueDate: '2026-10-29' }), 'TODAY')
  assert.equal(dueStatus({ ...loan, dueDate: '2026-10-30' }), 'UPCOMING')
  assert.equal(dueStatus({ ...loan, dueDate: null }), 'UNDATED')
  assert.equal(dueStatus({ ...loan, remainingBalance: 0 }), 'PAID')
  assert.equal(dueStatus({ ...loan, status: 'PAID' }), 'PAID')
  assert.equal(daysOverdue({ ...loan, dueDate: '2026-10-29' }), 0)
})

test('overdue day count handles month and leap-year boundaries', () => {
  assert.equal(daysOverdue({ ...loan, dueDate: '2024-02-28' }, '2024-03-01'), 2)
  assert.equal(daysOverdue({ ...loan, dueDate: '2026-09-30' }, '2026-10-01'), 1)
})

test('reminder uses remaining balance and a loan reference, with the current business details', () => {
  const message = reminderMessage(loan, 'J&J LPG', '09170000000')
  assert.match(message, /Maria/)
  assert.match(message, /J&J LPG/)
  assert.match(message, /600\.00/)
  assert.doesNotMatch(message, /1,000\.00/)
  assert.match(message, /UTANG-17/)
  assert.match(message, /1 day\(s\) overdue/)
  assert.match(message, /09170000000/)
})

test('reminder wording distinguishes today, future, undated and settled loans', () => {
  assert.match(reminderMessage({ ...loan, dueDate: '2026-10-29' }, 'Shop'), /date is today/)
  assert.doesNotMatch(reminderMessage({ ...loan, dueDate: '2026-10-30' }, 'Shop'), /overdue/)
  assert.match(reminderMessage({ ...loan, dueDate: null }, 'Shop'), /let us know your promised payment date/)
  assert.equal(reminderMessage({ ...loan, remainingBalance: 0 }, 'Shop'), '')
})
