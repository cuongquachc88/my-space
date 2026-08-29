package com.myspace.app.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.myspace.app.ui.navigation.Screen
import com.myspace.app.ui.screen.*

private data class NavItem(val screen: Screen, val label: String, val icon: @Composable () -> Unit)

@Composable
fun MySpaceNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val mainScreens = listOf(
        Screen.Notes, Screen.Keyvault, Screen.Subscriptions, Screen.Todos, Screen.MapPins
    )
    val showBottomBar = currentRoute in mainScreens.map { it.route }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    val items = listOf(
                        NavItem(Screen.Notes,         "Notes")         { Icon(Icons.Default.Article, null) },
                        NavItem(Screen.Keyvault,      "Vault")         { Icon(Icons.Default.Lock, null) },
                        NavItem(Screen.Subscriptions, "Subs")          { Icon(Icons.Default.CreditCard, null) },
                        NavItem(Screen.Todos,         "Tasks")         { Icon(Icons.Default.CheckBox, null) },
                        NavItem(Screen.MapPins,       "Map")           { Icon(Icons.Default.Place, null) },
                    )
                    items.forEach { item ->
                        NavigationBarItem(
                            selected = navBackStackEntry?.destination?.hierarchy?.any { it.route == item.screen.route } == true,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = item.icon,
                            label = { Text(item.label, style = MaterialTheme.typography.labelSmall) }
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Unlock.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(Screen.Unlock.route) {
                UnlockScreen(onUnlocked = {
                    navController.navigate(Screen.Notes.route) {
                        popUpTo(Screen.Unlock.route) { inclusive = true }
                    }
                })
            }
            composable(Screen.Notes.route) {
                NotesScreen(
                    onOpenNote = { id -> navController.navigate(Screen.NoteEdit.route(id)) },
                    onNewNote = { navController.navigate(Screen.NoteEdit.route()) }
                )
            }
            composable(Screen.NoteEdit.route) { backStack ->
                val id = backStack.arguments?.getString("id")
                NoteEditScreen(noteId = id, onBack = { navController.popBackStack() })
            }
            composable(Screen.Keyvault.route) {
                KeyvaultScreen(
                    onGenerator = { navController.navigate(Screen.Generator.route) },
                    onLock = {
                        navController.navigate(Screen.Unlock.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Generator.route) {
                GeneratorScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.Subscriptions.route) {
                SubscriptionsScreen(
                    onReports = { navController.navigate(Screen.Reports.route) }
                )
            }
            composable(Screen.Reports.route) {
                ReportsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.Todos.route) {
                TodosScreen(
                    onOpenList = { listId -> navController.navigate(Screen.TodoTasks.route(listId)) }
                )
            }
            composable(Screen.TodoTasks.route) { backStack ->
                val listId = backStack.arguments?.getString("listId") ?: return@composable
                TodoTasksScreen(listId = listId, onBack = { navController.popBackStack() })
            }
            composable(Screen.MapPins.route) {
                MapPinsScreen(
                    onOpenStack = { stackId -> navController.navigate(Screen.MapPinStack.route(stackId)) },
                    onQrScan = { navController.navigate(Screen.QrScanner.route) }
                )
            }
            composable(Screen.MapPinStack.route) { backStack ->
                val stackId = backStack.arguments?.getString("stackId") ?: return@composable
                MapPinStackScreen(stackId = stackId, onBack = { navController.popBackStack() })
            }
            composable(Screen.QrScanner.route) {
                QrScannerScreen(
                    onResult = { url ->
                        navController.previousBackStackEntry?.savedStateHandle?.set("scanned_url", url)
                        navController.popBackStack()
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Sync.route) {
                SyncScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.Settings.route) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
