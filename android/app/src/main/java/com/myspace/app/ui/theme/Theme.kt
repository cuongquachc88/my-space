package com.myspace.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ── Futuristic Tech palette (dark teal base, lime accent) ─────────────────

// Surfaces
val BgDeep        = Color(0xFF111F1F)   // dark teal canvas
val BgSurface     = Color(0xFF1A2E2E)   // card background
val BgElevated    = Color(0xFF1F3535)   // elevated panels, inputs
val BgOverlay     = Color(0xFF243C3C)   // dropdowns, nav bar
val BgCardBorder  = Color(0xFF2D4A4A)   // hairline borders

// Primary accent — lime/neon green (the hero color in the reference)
val AccentLime    = Color(0xFFB4E645)   // lime neon — primary CTA, selected states

// Per-screen accent colors (kept for feature identity, shifted warmer)
val AccentNotes   = Color(0xFF818CF8)   // indigo
val AccentVault   = Color(0xFFFBBF24)   // amber
val AccentGen     = Color(0xFFC4B5FD)   // violet
val AccentSubs    = Color(0xFF34D399)   // emerald
val AccentReport  = Color(0xFFF472B6)   // pink
val AccentTodo    = Color(0xFF38BDF8)   // sky
val AccentMaps    = Color(0xFFFB923C)   // orange
val AccentSync    = Color(0xFF60A5FA)   // blue

// Text
val TextPrimary   = Color(0xFFFFFFFF)   // pure white — works on dark teal
val TextSecondary = Color(0xFFABC4C4)   // muted teal-white
val TextDisabled  = Color(0xFF5F8080)   // faded

// Legacy aliases (used in screens)
val GlassBg     = Color(0x14FFFFFF)
val GlassBorder = Color(0x20FFFFFF)

private val DarkColors = darkColorScheme(
    primary          = AccentLime,
    secondary        = AccentSubs,
    tertiary         = AccentVault,
    background       = BgDeep,
    surface          = BgSurface,
    surfaceVariant   = BgElevated,
    onBackground     = TextPrimary,
    onSurface        = TextPrimary,
    onSurfaceVariant = TextSecondary,
    outline          = BgCardBorder,
    outlineVariant   = BgOverlay,
    error            = Color(0xFFFF6161),
    onError          = Color(0xFF1A0A0A),
)

@Composable
fun MySpaceTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography  = Typography,
        content     = content,
    )
}
