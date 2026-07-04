package com.myspace.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Surfaces — 4-level elevation ladder
val BgDeep        = Color(0xFF08090A)   // near-black canvas (Linear)
val BgSurface     = Color(0xFF0F1011)   // cards, nav bar (Raycast surface-card)
val BgElevated    = Color(0xFF161718)   // elevated modals, inputs
val BgOverlay     = Color(0xFF1E1F21)   // dropdowns, tooltips
val BgCardBorder  = Color(0xFF242728)   // 1dp hairline borders

// Accents — dark-tuned, slightly desaturated from current
val AccentNotes   = Color(0xFF7C7FEB)   // indigo (was 818CF8)
val AccentVault   = Color(0xFFF5A623)   // amber (was FBBF24)
val AccentGen     = Color(0xFFB39DDB)   // violet (was C4B5FD)
val AccentSubs    = Color(0xFF4CAF82)   // emerald (was 34D399)
val AccentReport  = Color(0xFFE879A0)   // pink (was F472B6)
val AccentTodo    = Color(0xFF57C1FF)   // sky (was 38BDF8)
val AccentMaps    = Color(0xFFFF8A50)   // orange (was FB923C)
val AccentSync    = Color(0xFF64B5F6)   // blue (was 60A5FA)

// Text
val TextPrimary   = Color(0xFFE5E5E5)   // avoid pure white eye strain
val TextSecondary = Color(0xFF9C9C9D)   // muted labels
val TextDisabled  = Color(0xFF6A6B6C)   // disabled

// Glass (kept for selective use only — not system-wide)
val GlassBg     = Color(0x0DFFFFFF)   // 5% white
val GlassBorder = Color(0x14FFFFFF)   // 8% white

private val DarkColors = darkColorScheme(
    primary          = AccentNotes,
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
