package com.myspace.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.myspace.app.crypto.CryptoManager
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.SecretEntity
import com.myspace.app.data.SecretMeta
import com.myspace.app.ui.theme.AccentVault
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultScreen(db: AppDatabase) {
    val scope = rememberCoroutineScope()
    var secrets by remember { mutableStateOf<List<SecretMeta>>(emptyList()) }
    var revealed by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var showAdd by remember { mutableStateOf(false) }
    var newLabel by remember { mutableStateOf("") }
    var newValue by remember { mutableStateOf("") }
    var newVisible by remember { mutableStateOf(false) }

    fun reload() { scope.launch { secrets = db.secretDao().getMeta() } }
    LaunchedEffect(Unit) { reload() }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Secret Vault") }, colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }, containerColor = AccentVault) {
                Icon(Icons.Default.Add, "Add secret")
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        LazyColumn(Modifier.padding(padding).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(secrets, key = { it.id }) { meta ->
                val value = revealed[meta.id]
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(meta.label, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                            if (value != null)
                                Text(value, style = MaterialTheme.typography.labelSmall, color = AccentVault)
                            else
                                Text("••••••••", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
                        }
                        IconButton(onClick = {
                            scope.launch {
                                if (value != null) {
                                    revealed = revealed - meta.id
                                } else {
                                    val row = db.secretDao().getById(meta.id)
                                    if (row != null) revealed = revealed + (meta.id to CryptoManager.decrypt(row.ciphertext, row.iv))
                                }
                            }
                        }) {
                            Icon(if (value != null) Icons.Default.VisibilityOff else Icons.Default.Visibility, "Toggle", tint = AccentVault.copy(alpha = 0.7f))
                        }
                        IconButton(onClick = { scope.launch { db.secretDao().delete(meta.id); reload() } }) {
                            Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error.copy(alpha = 0.6f))
                        }
                    }
                }
            }
        }
    }

    if (showAdd) {
        AlertDialog(
            onDismissRequest = { showAdd = false },
            title = { Text("New Secret") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newLabel, onValueChange = { newLabel = it }, label = { Text("Label") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(
                        value = newValue, onValueChange = { newValue = it },
                        label = { Text("Value") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                        visualTransformation = if (newVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { newVisible = !newVisible }) {
                                Icon(if (newVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                            }
                        }
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (newLabel.isNotBlank() && newValue.isNotBlank()) {
                        scope.launch {
                            val (ct, iv) = CryptoManager.encrypt(newValue)
                            val now = System.currentTimeMillis()
                            db.secretDao().upsert(SecretEntity(UUID.randomUUID().toString(), newLabel, ct, iv, "[]", now, now))
                            newLabel = ""; newValue = ""; showAdd = false; reload()
                        }
                    }
                }) { Text("Save", color = AccentVault) }
            },
            dismissButton = { TextButton(onClick = { showAdd = false }) { Text("Cancel") } },
        )
    }
}
