# Reports and bills

Reports and Bills compares expected subscription costs against actual paid amounts for any given month. It provides a 6-month spending chart, per-subscription bill recording with receipts, and multi-currency display. The feature is accessed from the Subscriptions view.

## How it works

### Chrome extension

`ReportsView` loads subscriptions, the current month's bills, and all bills (for the chart) in parallel on mount. The view is organized as:

1. **Month navigator**: prev/next buttons step through months. The next button is disabled on the current month. A currency dropdown lets the user switch display currency.
2. **Summary card**: three columns showing Expected (sum of `expectedMonthlyUSD` for active subs), Actual (sum of recorded bills converted to USD), and Recorded (count of subs with bills vs. total active subs).
3. **6-month dual bar chart**: a custom SVG chart (`DualBarChart`) with paired bars per month, expected (dim) and actual (bright). The current month is highlighted with a bolder color and a value label above its bar. Month labels are abbreviated names.
4. **Per-subscription rows**: each `SubRow` shows expected cost, actual bill (if recorded), and the difference with color-coded badge (red for over, green for under). Rows expand to an inline editor with amount, currency, notes, and receipt image upload.
5. **Bill images**: receipt images are embedded in the bill's `notes` field using a `||img:` delimiter followed by a JSON array of data URLs. This is a pragmatic (if unconventional) encoding that avoids schema changes.

Bill CRUD uses `BILLS_UPSERT` (create or update by `sub_id` + year + month), `BILLS_DELETE`, and `BILLS_LIST_MONTH`. The `expectedMonthlyUSD` function handles one-time subscriptions by only counting them in their start month.

### Android

`ReportsScreen` is a `LazyColumn` with similar structure but rendered with Compose Canvas:

- **Month navigation**: `YearMonth`-based with `ChevronLeft`/`ChevronRight` icons. Full month name display via `TextStyle.FULL`. Next is disabled past the current month.
- **Summary card**: Expected and Actual in the selected display currency, with a currency `ExposedDropdownMenuBox`.
- **6-month bar chart**: drawn with `Canvas` and `drawRoundRect`. Tapping a month bar selects it and updates the month navigator. Selected month bars are brighter with a dot indicator and amount label drawn via `android.graphics.Paint` on the native canvas. The chart includes a legend (Expected/Actual).
- **Per-subscription cards** (`SubReportCard`): expandable rows showing expected vs. actual amounts and difference. Expanded view shows the recorded bill or an "Add bill" button. Tapping opens a `BillEditorSheet` modal.
- **Bill editor**: a `ModalBottomSheet` with amount, currency dropdown, and notes. No receipt image support (unlike Chrome).
- **Inactive subscriptions**: shown in a separate dimmed section at the bottom with a count header.
- **Chart data**: built from `BillingCalc.buildMonthlyChart` which filters subs active in each month and sums `expectedMonthlyUSD`. Actual amounts come from querying all bills and filtering by year/month.

### Key differences

| Aspect | Chrome | Android |
|--------|--------|---------|
| Chart rendering | SVG `DualBarChart` component | Compose `Canvas` with `drawRoundRect` |
| Chart interaction | Static (current month highlighted) | Tappable bars to select month |
| Bill images | Supported (data URLs in notes) | Not supported |
| Bill notes encoding | `notes||img:[json]` delimiter | Plain notes only |
| Inactive subs display | Dimmed rows in main list | Separate section at bottom |
| Expected vs. actual diff | Color-coded badge inline | Color-coded text in expanded card |

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/sidepanel/views/ReportsView.tsx` | Chrome reports: month nav, summary, SVG chart, per-sub rows with bill editor |
| `android/app/src/main/java/com/myspace/app/ui/screens/ReportsScreen.kt` | Android reports: Canvas chart, expandable sub cards, bill editor sheet |
| `chrome-extension/src/lib/currency.ts` | Currency conversion used for expected/actual calculations |
| `android/app/src/main/java/com/myspace/app/util/BillingCalc.kt` | Month-aware billing math and chart data builder |

## Cross-links

- [Subscriptions](./subscriptions.md) - subscriptions provide the expected cost data; reports is accessed from the subs view
- [Google Drive sync](./google-drive-sync.md) - bills are included in encrypted Drive backups (Chrome only; Android sync does not yet include bills)
