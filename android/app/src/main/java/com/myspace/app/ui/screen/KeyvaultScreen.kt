package com.myspace.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.ui.theme.DarkBackground
import com.myspace.app.ui.viewmodel.KeyvaultViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KeyvaultScreen(
    onGenerator: () -> Unit,
    onLock: () -> Unit,
    vm: KeyvaultViewModel = hiltViewModel()
) {
    val secrets by vm.secrets.collectAsState()
    var showAdd by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Vault") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground),
                actions = {
                    IconButton(onClick = onGenerator) { Icon(Icons.Default.Key, "Generator") }
                    IconButton(onClick = { vm.lock(); onLock() }) { Icon(Icons.Default.Lock, "Lock") }
                    IconButton(onClick = { showAdd = !showAdd }) { Icon(Icons.Default.Add, "Add") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; vm.search(it) },
                label = { Text("Search secrets…") },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true
            )

            if (showAdd) AddSecretCard(vm = vm, onDone = { showAdd = false })

            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(secrets, key = { it.id }) { secret ->
                    SecretItemCard(
                        id = secret.id,
                        label = secret.label,
                        url = secret.url,
                        onCopy = { vm.copySecret(secret.id) },
                        onDelete = { vm.delete(secret.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun AddSecretCard(vm: KeyvaultViewModel, onDone: () -> Unit) {
    var label by remember { mutableStateOf("") }
    var value by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }

    ElevatedCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Add Secret", style = MaterialTheme.typography.labelMedium)
            OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Label") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = value, onValueChange = { value = it }, label = { Text("Secret value") }, singleLine = true, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation())
            OutlinedTextField(value = url, onValueChange = { url = it }, label = { Text("URL (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Description") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDone, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { vm.addSecret(label, value, url, desc); onDone() },
                    enabled = label.isNotBlank() && value.isNotBlank(),
                    modifier = Modifier.weight(1f)
                ) { Text("Save") }
            }
        }
    }
}

@Composable
private fun SecretItemCard(id: String, label: String, url: String, onCopy: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.titleSmall)
                if (url.isNotBlank())
                    Text(url.removePrefix("https://").removePrefix("http://").take(40),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f))
            }
            IconButton(onClick = onCopy) { Icon(Icons.Default.ContentCopy, "Copy", tint = MaterialTheme.colorScheme.primary) }
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
        }
    }
}
