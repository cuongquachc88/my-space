package com.myspace.app.ui.screen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.ui.viewmodel.GeneratorViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GeneratorScreen(
    onBack: () -> Unit,
    vm: GeneratorViewModel = hiltViewModel()
) {
    val context = LocalContext.current

    var length  by remember { mutableIntStateOf(20) }
    var upper   by remember { mutableStateOf(true) }
    var lower   by remember { mutableStateOf(true) }
    var digits  by remember { mutableStateOf(true) }
    var symbols by remember { mutableStateOf(true) }

    var password by remember { mutableStateOf("") }
    var copied   by remember { mutableStateOf(false) }

    LaunchedEffect(length, upper, lower, digits, symbols) {
        password = vm.generate(length, upper, lower, digits, symbols)
        copied = false
    }

    val strength = calcStrength(password)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Password Generator") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    cm.setPrimaryClip(ClipData.newPlainText("password", password))
                    copied = true
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = "Copy")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            // Password display card
            Surface(
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surfaceContainerHighest,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = password,
                        style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Monospace),
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = {
                        password = vm.generate(length, upper, lower, digits, symbols)
                        copied = false
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Regenerate",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            if (copied) {
                Text("Copied!", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
            }

            // Strength meter
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Strength: ${strengthLabel(strength)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = strengthColor(strength)
                )
                LinearProgressIndicator(
                    progress = { strength },
                    modifier = Modifier.fillMaxWidth().height(8.dp),
                    color = strengthColor(strength),
                    trackColor = MaterialTheme.colorScheme.outlineVariant,
                )
            }

            // Length slider
            Column {
                Text("Length: $length", style = MaterialTheme.typography.labelLarge)
                Slider(
                    value = length.toFloat(),
                    onValueChange = { length = it.toInt() },
                    valueRange = 8f..64f,
                    steps = 55,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Options chips
            Text("Include:", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = upper, onClick = { upper = !upper }, label = { Text("A–Z") })
                FilterChip(selected = lower, onClick = { lower = !lower }, label = { Text("a–z") })
                FilterChip(selected = digits, onClick = { digits = !digits }, label = { Text("0–9") })
                FilterChip(selected = symbols, onClick = { symbols = !symbols }, label = { Text("!@#") })
            }
        }
    }
}

private fun calcStrength(password: String): Float {
    if (password.isBlank()) return 0f
    var score = 0
    if (password.length >= 12) score++
    if (password.length >= 20) score++
    if (password.any { it.isUpperCase() }) score++
    if (password.any { it.isLowerCase() }) score++
    if (password.any { it.isDigit() }) score++
    if (password.any { !it.isLetterOrDigit() }) score++
    return (score / 6f).coerceIn(0f, 1f)
}

private fun strengthLabel(strength: Float) = when {
    strength < 0.34f -> "Weak"
    strength < 0.67f -> "Medium"
    else             -> "Strong"
}

@Composable
private fun strengthColor(strength: Float): Color = when {
    strength < 0.34f -> MaterialTheme.colorScheme.error
    strength < 0.67f -> MaterialTheme.colorScheme.secondary
    else             -> MaterialTheme.colorScheme.primary
}
