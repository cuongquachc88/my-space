package com.myspace.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.MapStackEntity
import com.myspace.app.ui.viewmodel.MapPinsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPinsScreen(
    onOpenStack: (String) -> Unit,
    onQrScan: () -> Unit,
    vm: MapPinsViewModel = hiltViewModel()
) {
    val stacks by vm.stacks.collectAsState()
    var showDialog by remember { mutableStateOf(false) }
    var newStackName by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Map Pins", style = MaterialTheme.typography.headlineSmall) },
                actions = {
                    IconButton(onClick = onQrScan) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan QR")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) { Icon(Icons.Default.Add, contentDescription = "New stack") }
        }
    ) { padding ->
        if (stacks.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No stacks yet. Tap + to create one.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(stacks, key = { it.id }) { stack ->
                    StackCard(
                        stack = stack,
                        onClick = { onOpenStack(stack.id) },
                        onDelete = { vm.deleteStack(stack.id) }
                    )
                }
            }
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false; newStackName = "" },
            title = { Text("New stack") },
            text = {
                OutlinedTextField(
                    value = newStackName,
                    onValueChange = { newStackName = it },
                    label = { Text("Stack name") },
                    singleLine = true,
                    shape = MaterialTheme.shapes.medium,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(onClick = {
                    if (newStackName.isNotBlank()) {
                        vm.addStack(newStackName.trim())
                        newStackName = ""
                        showDialog = false
                    }
                }) { Text("Create") }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false; newStackName = "" }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun StackCard(stack: MapStackEntity, onClick: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(
        onClick = onClick,
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Icon(Icons.Default.Place, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Text(stack.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
