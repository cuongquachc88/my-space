package com.myspace.app.ui

import android.os.SystemClock
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
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
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.myspace.app.data.AppDatabase
import com.myspace.app.ui.screens.*
import com.myspace.app.ui.theme.*
import kotlinx.coroutines.launch

// ── Screen descriptor ──────────────────────────────────────────────────────

sealed class Screen(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val accent: Color,
) {
    object Notes     : Screen("notes",   "Notes",     Icons.Default.Note,        AccentNotes)
    object Vault     : Screen("vault",   "Vault",     Icons.Default.Lock,        AccentVault)
    object Generator : Screen("gen",     "Generator", Icons.Default.Key,         AccentGen)
    object Subs      : Screen("subs",    "Subs",      Icons.Default.CreditCard,  AccentSubs)
    object Todo      : Screen("todo",    "To-Do",     Icons.Default.CheckBox,    AccentTodo)
    object MapPins   : Screen("maps",    "Map Pins",  Icons.Default.LocationOn,  AccentMaps)
    object Sync      : Screen("sync",    "Sync",      Icons.Default.Sync,        AccentSync)
    object Settings  : Screen("settings","Settings",  Icons.Default.Settings,    AccentSync)
}

val allScreens = listOf(
    Screen.Notes,
    Screen.Vault,
    Screen.Generator,
    Screen.Subs,
    Screen.Todo,
    Screen.MapPins,
    Screen.Sync,
    Screen.Settings,
)

// ── Logo composable ────────────────────────────────────────────────────────

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

// ── Pill/dot page indicator ────────────────────────────────────────────────

@Composable
private fun PagerIndicator(
    pageCount: Int,
    currentPage: Int,
    accentColor: Color,
    onPageSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(pageCount) { index ->
            val selected = index == currentPage
            val dotWidth by animateDpAsState(
                targetValue = if (selected) 24.dp else 6.dp,
                animationSpec = tween(250),
                label = "dot_width_$index",
            )
            val dotColor by animateColorAsState(
                targetValue = if (selected) accentColor else Color(0x33FFFFFF),
                animationSpec = tween(250),
                label = "dot_color_$index",
            )
            Box(
                modifier = Modifier
                    .height(6.dp)
                    .width(dotWidth)
                    .clip(RoundedCornerShape(3.dp))
                    .background(dotColor)
                    .clickable { onPageSelected(index) },
            )
        }
    }
}

// ── Lock screen ────────────────────────────────────────────────────────────

@Composable
private fun LockScreen(onUnlock: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeep),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = "Locked",
                tint = AccentVault,
                modifier = Modifier.size(64.dp),
            )
            Text(
                text = "My SPACE is locked",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Tap below to unlock",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
            )
            Button(
                onClick = onUnlock,
                colors = ButtonDefaults.buttonColors(containerColor = AccentVault),
            ) {
                Icon(Icons.Default.LockOpen, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Unlock")
            }
        }
    }
}

// Shows a BiometricPrompt that accepts biometric OR device credential (PIN/pattern/password).
// Only onSuccess unlocks — error/cancel keeps isLocked = true.
private fun showBiometricPrompt(
    activity: FragmentActivity,
    onSuccess: () -> Unit,
) {
    val executor = ContextCompat.getMainExecutor(activity)
    val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            onSuccess()
        }
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            // Keep locked — user must authenticate to proceed.
            // (errorCode ERROR_NEGATIVE_BUTTON / ERROR_USER_CANCELED stays locked by not calling onSuccess)
        }
        override fun onAuthenticationFailed() { /* retry handled by system prompt UI */ }
    })
    // DEVICE_CREDENTIAL allows PIN/pattern/password as fallback — no unauthenticated bypass.
    val allowedAuthenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
    prompt.authenticate(
        BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock My SPACE")
            .setSubtitle("Confirm your identity to continue")
            .setAllowedAuthenticators(allowedAuthenticators)
            .build()
    )
}

// ── App root ───────────────────────────────────────────────────────────────

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun MySpaceApp() {
    val context = LocalContext.current
    val db = remember { AppDatabase.get(context) }
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("myspace_settings", android.content.Context.MODE_PRIVATE) }

    var isLocked by remember { mutableStateOf(false) }

    var backgroundedAt by remember { mutableStateOf(0L) }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> {
                    backgroundedAt = SystemClock.elapsedRealtime()
                }
                Lifecycle.Event.ON_START -> {
                    val biometricEnabled = prefs.getBoolean("biometric_enabled", false)
                    val autoLockMs = prefs.getLong("auto_lock_ms", 15 * 60 * 1000L)
                    val elapsed = SystemClock.elapsedRealtime() - backgroundedAt
                    if (biometricEnabled || (autoLockMs > 0L && elapsed > autoLockMs)) {
                        isLocked = true
                    }
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val pagerState = rememberPagerState(initialPage = 0) { allScreens.size }

    val currentScreen = allScreens[pagerState.currentPage]

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
                    .background(Color(0xCC0A0E17))
                    .drawBehind {
                        drawLine(
                            color = Color(0x20FFFFFF),
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 1.dp.toPx(),
                        )
                    },
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
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xCC0A0E17))
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
                PagerIndicator(
                    pageCount = allScreens.size,
                    currentPage = pagerState.currentPage,
                    accentColor = currentScreen.accent,
                    onPageSelected = { page ->
                        scope.launch { pagerState.animateScrollToPage(page) }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 14.dp),
                )
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
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize(),
                beyondViewportPageCount = 1,
            ) { page ->
                when (allScreens[page]) {
                    Screen.Notes     -> NotesScreen(db)
                    Screen.Vault     -> VaultScreen(db)
                    Screen.Generator -> GeneratorScreen()
                    Screen.Subs      -> SubscriptionsScreen(db)
                    Screen.Todo      -> TodoScreen(db)
                    Screen.MapPins   -> MapPinsScreen(db)
                    Screen.Sync      -> SyncScreen(db, context)
                    Screen.Settings  -> SettingsScreen(
                        context = context,
                        onLockNow = {
                            isLocked = true
                            scope.launch { pagerState.animateScrollToPage(0) }
                        },
                    )
                }
            }
        }
    }

    // Lock overlay — rendered above the scaffold so no content is visible
    if (isLocked) {
        LockScreen(
            onUnlock = {
                val activity = context as? FragmentActivity
                if (activity != null) {
                    // Always require device auth (biometric or PIN/pattern/password).
                    // No tap-through: only onAuthenticationSucceeded clears isLocked.
                    showBiometricPrompt(
                        activity = activity,
                        onSuccess = { isLocked = false },
                    )
                }
                // If context is not a FragmentActivity (e.g. preview), stay locked.
            },
        )
    }
}
