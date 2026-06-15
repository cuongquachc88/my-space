package com.myspace.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.*
import com.myspace.app.data.AppDatabase
import com.myspace.app.ui.screens.*

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Notes   : Screen("notes",   "Notes",    Icons.Default.Note)
    object Vault   : Screen("vault",   "Vault",    Icons.Default.Lock)
    object Generator : Screen("gen",  "Generator",Icons.Default.Password)
    object Subs    : Screen("subs",    "Subs",     Icons.Default.CreditCard)
    object Sync    : Screen("sync",    "Sync",     Icons.Default.Sync)
}

val bottomNavItems = listOf(Screen.Notes, Screen.Vault, Screen.Generator, Screen.Subs, Screen.Sync)

@Composable
fun MySpaceApp() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val db = remember { AppDatabase.get(context) }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                val backStack by navController.currentBackStackEntryAsState()
                val current = backStack?.destination?.route
                bottomNavItems.forEach { screen ->
                    NavigationBarItem(
                        selected = current == screen.route,
                        onClick  = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon  = { Icon(screen.icon, contentDescription = screen.label) },
                        label = { Text(screen.label, style = MaterialTheme.typography.labelSmall) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(navController, startDestination = Screen.Notes.route, modifier = Modifier.padding(padding)) {
            composable(Screen.Notes.route)     { NotesScreen(db) }
            composable(Screen.Vault.route)     { VaultScreen(db) }
            composable(Screen.Generator.route) { GeneratorScreen() }
            composable(Screen.Subs.route)      { SubscriptionsScreen(db) }
            composable(Screen.Sync.route)      { SyncScreen(db, context) }
        }
    }
}
