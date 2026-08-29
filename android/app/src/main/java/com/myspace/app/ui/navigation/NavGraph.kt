package com.myspace.app.ui.navigation

sealed class Screen(val route: String) {
    object Unlock        : Screen("unlock")
    object Notes         : Screen("notes")
    object NoteEdit      : Screen("note_edit?id={id}") {
        fun route(id: String? = null) = if (id != null) "note_edit?id=$id" else "note_edit"
    }
    object Keyvault      : Screen("keyvault")
    object Generator     : Screen("generator")
    object Subscriptions : Screen("subscriptions")
    object Reports       : Screen("reports")
    object Todos         : Screen("todos")
    object TodoTasks     : Screen("todo_tasks/{listId}") {
        fun route(listId: String) = "todo_tasks/$listId"
    }
    object MapPins       : Screen("map_pins")
    object MapPinStack   : Screen("map_pin_stack/{stackId}") {
        fun route(stackId: String) = "map_pin_stack/$stackId"
    }
    object QrScanner     : Screen("qr_scanner")
    object Sync          : Screen("sync")
    object Settings      : Screen("settings")
}
