package com.myspace.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BgDeep        = Color(0xFF0A0E17)
val BgCard        = Color(0xFF131929)  // glass base: dark navy with slight blue tint
val BgCardBorder  = Color(0xFF1E2A3A)
val GlassBg       = Color(0x1AFFFFFF)  // white 10% — glass panel
val GlassBorder   = Color(0x26FFFFFF)  // white 15% — glass border
val AccentNotes   = Color(0xFF818CF8)  // indigo-400 — slightly lighter for dark bg
val AccentVault   = Color(0xFFFBBF24)  // amber-400
val AccentSync    = Color(0xFF60A5FA)  // blue-400
val AccentGen     = Color(0xFFC4B5FD)  // violet-300
val AccentSubs    = Color(0xFF34D399)  // emerald-400
val AccentReport  = Color(0xFFF472B6)  // pink-400
val TextPrimary   = Color(0xF0FFFFFF)
val TextSecondary = Color(0xAAFFFFFF)
val TextMuted     = Color(0x66FFFFFF)

private val DarkColors = darkColorScheme(
    primary          = AccentNotes,
    secondary        = AccentSubs,
    tertiary         = AccentVault,
    background       = BgDeep,
    surface          = BgCard,
    surfaceVariant   = Color(0xFF1A2234),
    onBackground     = TextPrimary,
    onSurface        = TextPrimary,
    onSurfaceVariant = TextSecondary,
    outline          = GlassBorder,
    outlineVariant   = BgCardBorder,
    error            = Color(0xFFFC8181),
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
