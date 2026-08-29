package com.myspace.app.ui.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.SecretEntity
import com.myspace.app.ui.viewmodel.KeyvaultViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KeyvaultScreen(
    onGenerator: () -> Unit,
    onLock: () -> Unit,
    vm: KeyvaultViewModel = hiltViewModel()
) {
    val secrets by vm.secrets.collectAsState()
    var query   by remember { mutableStateOf("") }
    var showAddSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Key Vault", style = MaterialTheme.typography.headlineSmall) },
                actions = {
                    IconButton(onClick = { vm.search(query) }) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = onGenerator) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "Generator")
                    }
                    IconButton(onClick = onLock) {
                        Icon(Icons.Default.Lock, contentDescription = "Lock vault")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddSheet = true },
                containerColor = MaterialTheme.colorScheme.secondary,
                contentColor = MaterialTheme.colorScheme.onSecondary
            ) { Icon(Icons.Default.Add, contentDescription = "Add secret") }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; vm.search(it) },
                placeholder = { Text("Search secrets…") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = MaterialTheme.shapes.medium
            )

            if (secrets.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No secrets yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(secrets, key = { it.id }) { secret ->
                        SecretCard(
                            secret = secret,
                            onCopy = { vm.copySecret(secret.id) },
                            onDelete = { vm.delete(secret.id) },
                            revealValue = { label, ciphertext, iv -> /* exposed via vm */ "" },
                            vm = vm
                        )
                    }
                }
            }
        }
    }

    if (showAddSheet) {
        AddSecretSheet(
            onDismiss = { showAddSheet = false },
            onSave = { label, value, url, desc ->
                vm.addSecret(label, value, url, desc)
                showAddSheet = false
            }
        )
    }
}

@Composable
private fun SecretCard(
    secret: SecretEntity,
    onCopy: () -> Unit,
    onDelete: () -> Unit,
    revealValue: (String, String, String) -> String,
    vm: KeyvaultViewModel
) {
    var revealed by remember { mutableStateOf<String?>(null) }
    var revealCountdown by remember { mutableIntStateOf(0) }

    LaunchedEffect(revealed) {
        if (revealed != null) {
            revealCountdown = 3
            repeat(3) {
                delay(1000)
                revealCountdown--
            }
            revealed = null
        }
    }

    ElevatedCard(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(Modifier.fillMaxWidth()) {
            // Amber left accent strip
            Box(
                Modifier
                    .width(4.dp)
                    .height(IntrinsicSize.Min)
                    .background(MaterialTheme.colorScheme.secondary)
            )
            Column(
                modifier = Modifier.weight(1f).padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = secret.label,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (secret.url.isNotBlank()) {
                    Text(
                        text = secret.url,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                AnimatedVisibility(visible = revealed != null) {
                    Text(
                        text = revealed ?: "",
                        style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                if (revealCountdown > 0) {
                    Text(
                        "Hiding in ${revealCountdown}s",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Column {
                IconButton(onClick = onCopy) {
                    Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(20.dp))
                }
                IconButton(onClick = {
                    if (revealed == null) {
                        try { revealed = vm.revealSecret(secret.id) } catch (_: Exception) {}
                    } else {
                        revealed = null
                    }
                }) {
                    Icon(
                        if (revealed != null) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = "Reveal",
                        modifier = Modifier.size(20.dp)
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete",
                        tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddSecretSheet(onDismiss: () -> Unit, onSave: (String, String, String, String) -> Unit) {
    var label by remember { mutableStateOf("") }
    var value by remember { mutableStateOf("") }
    var url   by remember { mutableStateOf("") }
    var desc  by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Add Secret", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(value = label, onValueChange = { label = it },
                label = { Text("Label") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
            OutlinedTextField(value = value, onValueChange = { value = it },
                label = { Text("Secret value") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
            OutlinedTextField(value = url, onValueChange = { url = it },
                label = { Text("URL (optional)") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
            OutlinedTextField(value = desc, onValueChange = { desc = it },
                label = { Text("Description (optional)") },
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { if (label.isNotBlank() && value.isNotBlank()) onSave(label, value, url, desc) },
                    modifier = Modifier.weight(1f)
                ) { Text("Save") }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
