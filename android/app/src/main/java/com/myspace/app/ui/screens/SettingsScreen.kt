package com.myspace.app.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.biometric.BiometricManager
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.BuildConfig
import com.myspace.app.ui.theme.AccentSync
import com.myspace.app.ui.theme.AccentVault
import com.myspace.app.ui.theme.BgSurface
import com.myspace.app.ui.theme.BgCardBorder

private const val PREFS_NAME = "myspace_settings"
private const val KEY_AUTOLOCK_MS = "auto_lock_ms"
private const val KEY_BIOMETRIC = "biometric_enabled"

private val AUTO_LOCK_OPTIONS = listOf(
    "5m" to 5 * 60 * 1000L,
    "15m" to 15 * 60 * 1000L,
    "30m" to 30 * 60 * 1000L,
    "∞" to 0L,
)

@Composable
fun SettingsScreen(context: Context, onLockNow: () -> Unit) {
    val prefs = remember { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }

    var autoLockMs by remember { mutableLongStateOf(prefs.getLong(KEY_AUTOLOCK_MS, 15 * 60 * 1000L)) }
    var biometricEnabled by remember { mutableStateOf(prefs.getBoolean(KEY_BIOMETRIC, false)) }

    val biometricAvailable = remember {
        BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // ── Security ─────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "SECURITY",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                if (biometricAvailable) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Biometric unlock", fontSize = 14.sp, color = Color.White)
                            Text("Use fingerprint to unlock vault", fontSize = 12.sp, color = Color(0x77FFFFFF))
                        }
                        Switch(
                            checked = biometricEnabled,
                            onCheckedChange = {
                                biometricEnabled = it
                                prefs.edit().putBoolean(KEY_BIOMETRIC, it).apply()
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = AccentVault,
                                uncheckedTrackColor = BgCardBorder,
                            ),
                        )
                    }
                } else {
                    Text(
                        "Biometric unlock not available on this device",
                        fontSize = 13.sp,
                        color = Color(0x44FFFFFF),
                    )
                }
            }
        }

        // ── Auto-lock ─────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "AUTO-LOCK",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AUTO_LOCK_OPTIONS.forEach { (label, ms) ->
                        val selected = autoLockMs == ms
                        Button(
                            onClick = {
                                autoLockMs = ms
                                prefs.edit().putLong(KEY_AUTOLOCK_MS, ms).apply()
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) AccentSync.copy(alpha = 0.2f) else BgCardBorder,
                                contentColor = if (selected) AccentSync else Color(0x88FFFFFF),
                            ),
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 10.dp),
                            elevation = ButtonDefaults.buttonElevation(0.dp),
                        ) {
                            Text(label, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }
        }

        // ── Lock Now ─────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "SESSION",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                Button(
                    onClick = onLockNow,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AccentVault.copy(alpha = 0.15f),
                        contentColor = AccentVault,
                    ),
                    elevation = ButtonDefaults.buttonElevation(0.dp),
                ) {
                    Icon(Icons.Default.Lock, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Lock Now", fontSize = 14.sp)
                }
            }
        }

        // ── About ─────────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "ABOUT",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Version", fontSize = 14.sp, color = Color.White, modifier = Modifier.weight(1f))
                    Text(BuildConfig.VERSION_NAME, fontSize = 13.sp, color = Color(0x77FFFFFF))
                }
                HorizontalDivider(color = Color(0x15FFFFFF))
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://my-space-rouge.vercel.app/privacy-policy.html")))
                    },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Text("Privacy Policy", fontSize = 14.sp, color = AccentSync)
                }
                HorizontalDivider(color = Color(0x15FFFFFF))
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://my-space-rouge.vercel.app/terms-of-service.html")))
                    },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Text("Terms of Service", fontSize = 14.sp, color = AccentSync)
                }
            }
        }
    }
}
