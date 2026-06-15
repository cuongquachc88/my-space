package com.myspace.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BgDeep       = Color(0xFF0D1117)
val BgCard       = Color(0xFF161B22)
val BgCardBorder = Color(0xFF30363D)
val AccentNotes  = Color(0xFF6366F1)
val AccentVault  = Color(0xFFF59E0B)
val AccentSync   = Color(0xFF3B82F6)
val AccentGen    = Color(0xFFA78BFA)
val AccentSubs   = Color(0xFF34D399)
val TextPrimary  = Color(0xCCFFFFFF)
val TextMuted    = Color(0x66FFFFFF)

private val DarkColors = darkColorScheme(
    primary         = AccentNotes,
    secondary       = AccentSubs,
    tertiary        = AccentVault,
    background      = BgDeep,
    surface         = BgCard,
    onBackground    = TextPrimary,
    onSurface       = TextPrimary,
    outline         = BgCardBorder,
)

@Composable
fun MySpaceTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography  = Typography,
        content     = content,
    )
}
