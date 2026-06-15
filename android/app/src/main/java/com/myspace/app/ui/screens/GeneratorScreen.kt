package com.myspace.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.ui.theme.AccentGen

private val LOWER  = "abcdefghijklmnopqrstuvwxyz"
private val UPPER  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
private val DIGITS = "0123456789"
private val SYMBOLS = "!@#\$%^&*()-_=+[]{}|;:,.<>?"

fun generatePassword(length: Int, upper: Boolean, digits: Boolean, symbols: Boolean): String {
    var pool = LOWER
    if (upper)   pool += UPPER
    if (digits)  pool += DIGITS
    if (symbols) pool += SYMBOLS
    return (1..length).map { pool.random() }.joinToString("")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GeneratorScreen() {
    val clipboard = LocalClipboardManager.current
    var length  by remember { mutableIntStateOf(20) }
    var upper   by remember { mutableStateOf(true) }
    var digits  by remember { mutableStateOf(true) }
    var symbols by remember { mutableStateOf(true) }
    var password by remember { mutableStateOf(generatePassword(20, true, true, true)) }
    var copied  by remember { mutableStateOf(false) }

    fun regen() { password = generatePassword(length, upper, digits, symbols); copied = false }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Password Generator") }, colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(password, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelSmall.copy(fontSize = 13.sp), color = AccentGen)
                    IconButton(onClick = {
                        clipboard.setText(AnnotatedString(password))
                        copied = true
                    }) {
                        Icon(Icons.Default.ContentCopy, "Copy", tint = if (copied) AccentGen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                    IconButton(onClick = { regen() }) {
                        Icon(Icons.Default.Refresh, "Regenerate", tint = AccentGen)
                    }
                }
            }

            if (copied) Text("Copied!", color = AccentGen, style = MaterialTheme.typography.labelSmall)

            Text("Length: $length", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Slider(value = length.toFloat(), onValueChange = { length = it.toInt(); regen() }, valueRange = 8f..64f, steps = 55, colors = SliderDefaults.colors(thumbColor = AccentGen, activeTrackColor = AccentGen))

            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(8.dp)) {
                    listOf(
                        Triple("Uppercase (A-Z)", upper) { v: Boolean -> upper = v; regen() },
                        Triple("Digits (0-9)", digits) { v: Boolean -> digits = v; regen() },
                        Triple("Symbols (!@#...)", symbols) { v: Boolean -> symbols = v; regen() },
                    ).forEach { (label, checked, onToggle) ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(label, Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurface)
                            Switch(checked = checked, onCheckedChange = onToggle, colors = SwitchDefaults.colors(checkedThumbColor = AccentGen, checkedTrackColor = AccentGen.copy(alpha = 0.4f)))
                        }
                    }
                }
            }
        }
    }
}
