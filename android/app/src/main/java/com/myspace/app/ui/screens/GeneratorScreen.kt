package com.myspace.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.ui.theme.AccentGen
import com.myspace.app.ui.theme.BgSurface
import com.myspace.app.ui.theme.BgCardBorder

private val LOWER   = "abcdefghijklmnopqrstuvwxyz"
private val UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
private val DIGITS  = "0123456789"
private val SYMBOLS = "!@#\$%^&*()-_=+[]{}|;:,.<>?"

fun generatePassword(length: Int, upper: Boolean, digits: Boolean, symbols: Boolean): String {
    var pool = LOWER
    if (upper)   pool += UPPER
    if (digits)  pool += DIGITS
    if (symbols) pool += SYMBOLS
    return (1..length).map { pool.random() }.joinToString("")
}

@Composable
fun GeneratorScreen() {
    val clipboard = LocalClipboardManager.current
    var length   by remember { mutableIntStateOf(20) }
    var upper    by remember { mutableStateOf(true) }
    var digits   by remember { mutableStateOf(true) }
    var symbols  by remember { mutableStateOf(true) }
    var password by remember { mutableStateOf(generatePassword(20, true, true, true)) }
    var copied   by remember { mutableStateOf(false) }

    fun regen() { password = generatePassword(length, upper, digits, symbols); copied = false }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Password display card
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape  = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    password,
                    fontFamily = FontFamily.Monospace,
                    fontSize   = 14.sp,
                    color      = AccentGen,
                    lineHeight = 22.sp,
                    letterSpacing = 0.5.sp,
                )
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { clipboard.setText(AnnotatedString(password)); copied = true },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = if (copied) AccentGen else Color(0x88FFFFFF)),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            width = 1.dp,
                        ),
                    ) {
                        Icon(Icons.Default.ContentCopy, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(if (copied) "Copied!" else "Copy", fontSize = 13.sp)
                    }
                    Button(
                        onClick = { regen() },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentGen.copy(alpha = 0.15f), contentColor = AccentGen),
                    ) {
                        Icon(Icons.Default.Refresh, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Regenerate", fontSize = 13.sp)
                    }
                }
            }
        }

        // Length slider
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape  = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Length", fontSize = 14.sp, color = Color(0xAAFFFFFF), modifier = Modifier.weight(1f))
                    Text(
                        "$length",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentGen,
                    )
                }
                Slider(
                    value = length.toFloat(),
                    onValueChange = { length = it.toInt(); regen() },
                    valueRange = 8f..64f,
                    steps = 55,
                    colors = SliderDefaults.colors(
                        thumbColor = AccentGen,
                        activeTrackColor = AccentGen,
                        inactiveTrackColor = BgCardBorder,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        // Options card
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape  = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(vertical = 4.dp)) {
                listOf(
                    Triple("Uppercase (A–Z)", upper)  { v: Boolean -> upper   = v; regen() },
                    Triple("Digits (0–9)",    digits)  { v: Boolean -> digits  = v; regen() },
                    Triple("Symbols (!@#…)",  symbols) { v: Boolean -> symbols = v; regen() },
                ).forEachIndexed { i, (label, checked, onToggle) ->
                    if (i > 0) HorizontalDivider(color = Color(0x15FFFFFF), thickness = 1.dp, modifier = Modifier.padding(horizontal = 16.dp))
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(label, fontSize = 14.sp, color = Color.White, modifier = Modifier.weight(1f))
                        Switch(
                            checked = checked,
                            onCheckedChange = onToggle,
                            colors = SwitchDefaults.colors(
                                checkedThumbColor  = Color.White,
                                checkedTrackColor  = AccentGen,
                                uncheckedThumbColor = Color(0x88FFFFFF),
                                uncheckedTrackColor = BgCardBorder,
                            ),
                        )
                    }
                }
            }
        }
    }
}
