# Subscriptions

Subscriptions tracks recurring payments (Netflix, gym membership, cloud storage, etc.) with billing cycles, multi-currency support, and pause/resume. It calculates a normalized monthly spend and feeds data into the Reports and Bills feature.

## How it works

### Chrome extension

`SubscriptionsView` presents a searchable, tag-filterable list of subscription cards plus an inline add form. Each `SubCard` shows:

- Name, formatted amount in native currency (`Intl.NumberFormat` with `style: currency`), and a cycle badge (`/mo`, `/yr`, `/wk`, `once`).
- Next billing date computed by `nextBillingDate`, with urgency coloring: red if due in 3 days, amber if 7 days, otherwise dim. Overdue and "today" states are explicitly handled.
- Pause/resume toggle and delete buttons. Paused subscriptions are dimmed and excluded from the monthly total.
- Optional tags and notes.

The **monthly spend summary** at the bottom of the list calls `monthlyEquivalentUSD` on each active subscription, sums them, and displays the total in USD. A "Reports & Bills" button navigates to the reports view with the spend figure.

`nextBilling.ts` computes the next billing date by advancing the start date in cycle increments (weekly +7 days, monthly +1 month, yearly +1 year) until the date is in the future, capped at 1000 iterations. One-time subscriptions return the start date unchanged.

`currency.ts` provides fixed exchange rate tables (USD, EUR, GBP, VND, JPY, SGD) and conversion helpers. Rates are hardcoded, not fetched live. The `monthlyEquivalentUSD` function normalizes any cycle to a monthly USD figure: monthly is direct, yearly divides by 12, weekly multiplies by 4.33, one-time returns 0.

The add form captures name, amount, currency (dropdown), cycle (4 button toggles), start/billing date (date picker), tags (`TagInput`), and optional notes.

### Android

`SubscriptionsScreen` has a richer card layout than Chrome:

- **Logo support**: each subscription can have an app logo image (picked from gallery via `ActivityResultContracts.GetContent`), stored as a content URI. If no logo, a colored letter avatar is shown. Chrome has no logo feature.
- **Currency switcher**: the monthly total card has an `ExposedDropdownMenuBox` to switch the display currency, which converts the USD total via `FROM_USD`. Chrome always shows the total in USD.
- **Per-card monthly equivalent**: each `SubCard` shows the converted monthly cost in the selected display currency, not just the native amount.
- **Editor sheet**: a full `ModalBottomSheet` with logo picker, name, amount, currency dropdown, cycle `FilterChip` row, and an active toggle with explanatory text. Chrome uses an inline form.
- **Edit existing**: Android supports tapping a card to edit an existing subscription. Chrome only supports add and delete (no inline edit of existing subs).
- **Reports navigation**: a full-width button at the bottom of the list opens `ReportsScreen` inline (replaces the subscriptions view).

### Billing calculation (Android)

`BillingCalc.kt` mirrors the Chrome currency logic and adds month-aware functions:

- `expectedMonthlyUSD(sub, ym)`: returns 0 if the subscription started after the given `YearMonth`, otherwise the monthly equivalent.
- `subActiveInMonth(sub, ym)`: checks if a sub was active in a specific month.
- `buildMonthlyChart(subs, months, referenceYM)`: builds a 6-month data series for charting, filtering subs active in each month.

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/sidepanel/views/SubscriptionsView.tsx` | Chrome subscriptions list, cards, add form, monthly spend |
| `chrome-extension/src/lib/nextBilling.ts` | Next billing date calculator with cycle advancement |
| `chrome-extension/src/lib/currency.ts` | Fixed exchange rates and monthly-equivalent conversion |
| `android/app/src/main/java/com/myspace/app/ui/screens/SubscriptionsScreen.kt` | Android subscriptions list with logos, currency switcher, editor sheet |
| `android/app/src/main/java/com/myspace/app/util/BillingCalc.kt` | Android billing math: monthly equivalents, month-active checks, chart builder |

## Cross-links

- [Reports and bills](./reports-and-bills.md) - subscriptions feed expected amounts into monthly reports
- [Google Drive sync](./google-drive-sync.md) - subscriptions are included in encrypted Drive backups
