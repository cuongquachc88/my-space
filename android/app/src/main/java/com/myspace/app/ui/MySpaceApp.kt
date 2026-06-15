package com.myspace.app.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.*
import com.myspace.app.data.AppDatabase
import com.myspace.app.ui.screens.*
import com.myspace.app.ui.theme.*
sealed class Screen(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val accent: Color,
) {
    object Notes     : Screen("notes",   "Notes",     Icons.Default.Note,       AccentNotes)
    object Vault     : Screen("vault",   "Vault",     Icons.Default.Lock,       AccentVault)
    object Generator : Screen("gen",     "Generator", Icons.Default.Key,        AccentGen)
    object Subs      : Screen("subs",    "Subs",      Icons.Default.CreditCard, AccentSubs)
    object Sync      : Screen("sync",    "Sync",      Icons.Default.Sync,       AccentSync)
}

val bottomNavItems = listOf(
    Screen.Notes, Screen.Vault, Screen.Generator, Screen.Subs, Screen.Sync
)

@Composable
fun SpaceLogo(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .drawBehind { drawShield(this) },
        )
        Column(verticalArrangement = Arrangement.Center) {
            Text(
                text = "My SPACE",
                fontWeight = FontWeight.Bold,
                fontSize = 19.sp,
                letterSpacing = (-0.5).sp,
                color = Color.White,
                lineHeight = 22.sp,
            )
            Text(
                text = "Private vault",
                fontSize = 12.sp,
                color = Color(0x77FFFFFF),
                letterSpacing = 0.2.sp,
                lineHeight = 14.sp,
            )
        }
    }
}

private fun drawShield(scope: DrawScope) {
    val w = scope.size.width
    val h = scope.size.height
    val paint = Paint().apply { isAntiAlias = true }
    scope.drawContext.canvas.apply {
        val path = Path().apply {
            moveTo(w * 0.5f, 0f)
            lineTo(w, h * 0.18f)
            lineTo(w, h * 0.55f)
            cubicTo(w, h * 0.82f, w * 0.75f, h * 0.93f, w * 0.5f, h)
            cubicTo(w * 0.25f, h * 0.93f, 0f, h * 0.82f, 0f, h * 0.55f)
            lineTo(0f, h * 0.18f)
            close()
        }
        paint.style = PaintingStyle.Fill
        paint.color = Color(0xFFF59E0B).copy(alpha = 0.15f)
        drawPath(path, paint)
        paint.style = PaintingStyle.Stroke
        paint.strokeWidth = w * 0.07f
        paint.color = Color(0xFFF59E0B).copy(alpha = 0.9f)
        drawPath(path, paint)

        val lx = w * 0.32f; val ly = h * 0.46f
        val lw = w * 0.36f; val lh = h * 0.28f
        paint.style = PaintingStyle.Fill
        paint.color = Color(0xFFFBBF24).copy(alpha = 0.95f)
        drawPath(Path().apply {
            addRoundRect(RoundRect(lx, ly, lx + lw, ly + lh, CornerRadius(w * 0.06f)))
        }, paint)

        paint.style = PaintingStyle.Stroke
        paint.strokeWidth = w * 0.07f
        paint.color = Color(0xFFFBBF24).copy(alpha = 0.95f)
        drawPath(Path().apply {
            moveTo(lx + lw * 0.25f, ly)
            lineTo(lx + lw * 0.25f, ly - lh * 0.40f)
            cubicTo(lx + lw * 0.25f, ly - lh * 0.70f, lx + lw * 0.75f, ly - lh * 0.70f, lx + lw * 0.75f, ly - lh * 0.40f)
            lineTo(lx + lw * 0.75f, ly)
        }, paint)
    }
}

@Composable
fun MySpaceApp() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val db = remember { AppDatabase.get(context) }
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val currentScreen = bottomNavItems.firstOrNull { it.route == currentRoute } ?: Screen.Notes

    val glowColor by animateColorAsState(
        targetValue = currentScreen.accent.copy(alpha = 0.10f),
        animationSpec = tween(400),
        label = "glow",
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xCC0A0E17))  // glass: semi-transparent dark
                    .drawBehind {
                        drawLine(
                            color = Color(0x20FFFFFF),
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 1.dp.toPx(),
                        )
                    }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    SpaceLogo()
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(currentScreen.accent.copy(alpha = 0.15f))
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                    ) {
                        Text(
                            text = currentScreen.label,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = currentScreen.accent,
                            letterSpacing = 0.2.sp,
                        )
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xCC0A0E17),  // glass bottom nav
                tonalElevation = 0.dp,
                modifier = Modifier
                    .drawBehind {
                        drawLine(
                            color = Color(0x20FFFFFF),
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = 1.dp.toPx(),
                        )
                    }
                    .navigationBarsPadding(),
            ) {
                bottomNavItems.forEach { screen ->
                    val selected = currentRoute == screen.route
                    val iconColor by animateColorAsState(
                        targetValue = if (selected) screen.accent else Color(0x66FFFFFF),
                        animationSpec = tween(250),
                        label = "icon_${screen.route}",
                    )
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Box(contentAlignment = Alignment.Center) {
                                if (selected) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(screen.accent.copy(alpha = 0.15f)),
                                    )
                                }
                                Icon(
                                    screen.icon,
                                    contentDescription = screen.label,
                                    tint = iconColor,
                                    modifier = Modifier.size(22.dp),
                                )
                            }
                        },
                        label = {
                            Text(
                                text = screen.label,
                                fontSize = 13.sp,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                color = iconColor,
                                textAlign = TextAlign.Center,
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = Color.Transparent,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .drawBehind {
                    drawRect(
                        brush = Brush.verticalGradient(
                            colors = listOf(glowColor, Color.Transparent),
                            endY = size.height * 0.30f,
                        ),
                    )
                },
        ) {
            NavHost(navController, startDestination = Screen.Notes.route, modifier = Modifier.fillMaxSize()) {
                composable(Screen.Notes.route)     { NotesScreen(db) }
                composable(Screen.Vault.route)     { VaultScreen(db) }
                composable(Screen.Generator.route) { GeneratorScreen() }
                composable(Screen.Subs.route)      { SubscriptionsScreen(db) }
                composable(Screen.Sync.route)      { SyncScreen(db, context) }
            }
        }
    }
}
