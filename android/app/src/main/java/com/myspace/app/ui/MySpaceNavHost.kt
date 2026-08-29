package com.myspace.app.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.myspace.app.ui.navigation.Screen
import com.myspace.app.ui.screen.*
import com.myspace.app.ui.theme.*

private data class NavItem(
    val screen: Screen,
    val label: String,
    val icon: @Composable () -> Unit,
    val selectedIcon: @Composable () -> Unit = icon
)

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
        containerColor = Background,
        bottomBar = {
            if (showBottomBar) {
                FloatingBottomNav(
                    items = listOf(
                        NavItem(Screen.Notes,         "Notes",  { Icon(Icons.Default.Article, null) }),
                        NavItem(Screen.Keyvault,      "Vault",  { Icon(Icons.Default.Lock, null) }),
                        NavItem(Screen.Subscriptions, "Subs",   { Icon(Icons.Default.CreditCard, null) }),
                        NavItem(Screen.Todos,         "Tasks",  { Icon(Icons.Default.CheckBox, null) }),
                        NavItem(Screen.MapPins,       "Map",    { Icon(Icons.Default.Place, null) }),
                    ),
                    currentRoute = currentRoute,
                    onNavigate = { screen ->
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    navBackStackEntry = navBackStackEntry
                )
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Unlock.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = padding.calculateBottomPadding())
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
                    onNewNote = { navController.navigate(Screen.NoteEdit.route()) },
                    onLock = {
                        navController.navigate(Screen.Unlock.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onSync = { navController.navigate(Screen.Sync.route) },
                    onSettings = { navController.navigate(Screen.Settings.route) }
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

@Composable
private fun FloatingBottomNav(
    items: List<NavItem>,
    currentRoute: String?,
    onNavigate: (Screen) -> Unit,
    navBackStackEntry: androidx.navigation.NavBackStackEntry?
) {
    // Outer shell: floating pill with subtle border
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        shape = RoundedCornerShape(32.dp),
        color = SurfaceContainerHigh,
        tonalElevation = 3.dp,
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEach { item ->
                val selected = navBackStackEntry?.destination?.hierarchy
                    ?.any { it.route == item.screen.route } == true

                val accentColor = when (item.screen) {
                    Screen.Keyvault -> Secondary
                    Screen.Subscriptions -> Tertiary
                    else -> Primary
                }

                NavPillItem(
                    label = item.label,
                    icon = item.icon,
                    selected = selected,
                    accentColor = accentColor,
                    onClick = { onNavigate(item.screen) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun NavPillItem(
    label: String,
    icon: @Composable () -> Unit,
    selected: Boolean,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val indicatorColor by animateColorAsState(
        targetValue = if (selected) accentColor.copy(alpha = 0.15f) else Color.Transparent,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "indicator"
    )
    val contentColor by animateColorAsState(
        targetValue = if (selected) accentColor else OnSurfaceVariant.copy(alpha = 0.5f),
        label = "content"
    )
    val indicatorWidth by animateDpAsState(
        targetValue = if (selected) 56.dp else 32.dp,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "width"
    )

    Column(
        modifier = modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        // Pill indicator — wide horizontal, short height (M3 Expressive style)
        Box(
            modifier = Modifier
                .width(indicatorWidth)
                .height(30.dp)
                .clip(RoundedCornerShape(15.dp))
                .background(indicatorColor),
            contentAlignment = Alignment.Center
        ) {
            CompositionLocalProvider(LocalContentColor provides contentColor) {
                icon()
            }
        }
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = contentColor
        )
    }
}
