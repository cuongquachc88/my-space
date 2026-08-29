package com.myspace.app.ui.screen

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.myspace.app.data.entity.MapPinEntity
import com.myspace.app.ui.viewmodel.MapPinsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPinStackScreen(
    stackId: String,
    onBack: () -> Unit,
    vm: MapPinsViewModel = hiltViewModel()
) {
    val pins by vm.pinsFor(stackId).collectAsState()
    val stacks by vm.stacks.collectAsState()
    val stackName = stacks.find { it.id == stackId }?.name ?: "Pins"

    var showAddDialog by remember { mutableStateOf(false) }
    var newLabel by remember { mutableStateOf("") }
    var newUrl   by remember { mutableStateOf("") }

    // Listen for scanned URL from QR scanner
    // (passed via savedStateHandle from parent nav back stack)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stackName) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) { Icon(Icons.Default.Add, contentDescription = "Add pin") }
        }
    ) { padding ->
        if (pins.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No pins yet. Tap + to add one.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(pins, key = { it.id }) { pin ->
                    PinCard(pin = pin, onDelete = { vm.deletePin(pin.id) })
                }
            }
        }
    }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false; newLabel = ""; newUrl = "" },
            title = { Text("Add pin") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = newLabel, onValueChange = { newLabel = it },
                        label = { Text("Label") }, singleLine = true,
                        shape = MaterialTheme.shapes.medium, modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newUrl, onValueChange = { newUrl = it },
                        label = { Text("Map URL or coordinates") }, singleLine = true,
                        shape = MaterialTheme.shapes.medium, modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (newLabel.isNotBlank()) {
                        vm.addPinFromUrl(stackId, newLabel.trim(), newUrl.trim())
                        newLabel = ""
                        newUrl = ""
                        showAddDialog = false
                    }
                }) { Text("Add") }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false; newLabel = ""; newUrl = "" }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun PinCard(pin: MapPinEntity, onDelete: () -> Unit) {
    val context = LocalContext.current

    ElevatedCard(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Place, contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(pin.label, style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete",
                        tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                }
            }

            // Coordinates
            if (pin.lat != 0.0 || pin.lng != 0.0) {
                Text(
                    "${"%.6f".format(pin.lat)}, ${"%.6f".format(pin.lng)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (pin.note.isNotBlank()) {
                Text(pin.note, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2,
                    overflow = TextOverflow.Ellipsis)
            }

            // Open in Maps button
            if (pin.lat != 0.0 || pin.lng != 0.0) {
                OutlinedButton(
                    onClick = {
                        val geoUri = Uri.parse("geo:${pin.lat},${pin.lng}?q=${pin.lat},${pin.lng}(${Uri.encode(pin.label)})")
                        context.startActivity(Intent(Intent.ACTION_VIEW, geoUri))
                    },
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 6.dp),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Open in Maps", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}
