# To-do lists

To-do lists is a task manager with multiple lists, each with a custom color and pixel-art icon. Tasks support priorities, due dates, recurrence, and notes. Tasks can be grouped by list or by due date with a timeline view.

## How it works

### Chrome extension

`TodoView` renders a two-level navigation: a list of todo lists, then a drill-down task screen for the selected list.

**Lists view**:
- Each list is a `ListCard` with a colored icon badge (`PixelIcon`), name, and expand menu for edit/delete.
- Creating a list opens an inline form with name input, `IconPicker` (searchable grid of 30 pixel-art icons), and color picker (8 preset colors).
- Lists can be renamed and re-iconed via the same form.

**Task screen** (`TaskScreen`):
- Header with back button, list color dot, list name, group-mode toggle (By date / By list), and a show-done toggle.
- **By list mode**: flat list of `TaskRow` components.
- **By date mode**: tasks are grouped into timeline sections (Overdue, Today, Tomorrow, This week, This month, Later, No due date) with a vertical timeline line and colored dots. Overdue is red, Today uses the list color.
- **TaskRow**: checkbox toggle, title (strikethrough when done), priority badge (low=green, medium=yellow, high=red), due date with urgency coloring, recurrence indicator. Clicking the row body expands an action bar with Edit and Delete. Editing opens an inline form with title, note, priority buttons, date picker, and recurrence dropdown.
- **AddTaskForm**: inline collapsible form at the bottom with the same fields.
- **Recurrence**: when a recurring task is checked done, instead of marking it done, the due date advances by the recurrence interval (daily +1, weekly +7, monthly +1 month) via `nextDueDate`. The task stays active with the new due date.

`IconPicker` is a reusable component with a searchable grid of 30 icons organized into categories: places (home, work, school, hospital, etc.), food and travel (restaurant, cafe, airport, etc.), and productivity (star, flag, inbox, calendar, code, etc.). Icons are rendered as `PixelIcon` SVG components.

### Android

`TodoScreen` provides the same core functionality with Compose-native patterns. Key differences:

- **Simpler list management**: the Android version focuses on the task list view. List creation and icon picking are more streamlined.
- **Task interactions**: tapping a task toggles its done state directly; long-press or menu options handle edit/delete rather than the expand-to-reveal pattern used in Chrome.
- **No timeline view**: Android uses a flat list without the date-grouped timeline visualization.
- **Recurrence handling**: similar logic for advancing due dates on recurring task completion.

### Data model

Two tables: `TodoList` (`id`, `name`, `color`, `icon`) and `TodoTask` (`id`, `list_id`, `title`, `note`, `done`, `priority`, `due_date`, `recurrence`, `created_at`, `updated_at`). Message types follow the `TODO_LISTS_*` and `TODO_TASKS_*` patterns.

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/sidepanel/views/TodoView.tsx` | Full todo UI: lists view, task screen, timeline grouping, task rows, add form |
| `chrome-extension/src/sidepanel/components/IconPicker.tsx` | Searchable pixel-icon picker grid with 30 icons |
| `android/app/src/main/java/com/myspace/app/ui/screens/TodoScreen.kt` | Android todo list and task management |

## Cross-links

- [Map pins](./map-pins.md) - shares the `IconPicker` component and list/card navigation pattern
- [Chrome extension](../applications/chrome-extension.md) - extension architecture and message routing
- [Google Drive sync](./google-drive-sync.md) - todo lists and tasks are included in encrypted Drive backups
