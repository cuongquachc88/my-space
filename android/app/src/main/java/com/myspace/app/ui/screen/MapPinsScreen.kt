package com.myspace.app.ui.screen

import androidx.compose.foundation.clickable
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
import com.myspace.app.ui.theme.DarkBackground
import com.myspace.app.ui.viewmodel.MapPinsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPinsScreen(
    onOpenStack: (String) -> Unit,
    onQrScan: () -> Unit,
    vm: MapPinsViewModel = hiltViewModel()
) {
    val stacks by vm.stacks.collectAsState()
    var showAdd by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Map Pins") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground),
                actions = {
                    IconButton(onClick = onQrScan) { Icon(Icons.Default.QrCodeScanner, "Scan QR share link") }
                    IconButton(onClick = { showAdd = !showAdd }) { Icon(Icons.Default.Add, "New stack") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (showAdd) {
                Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("Stack name") }, singleLine = true, modifier = Modifier.weight(1f))
                    Button(onClick = { vm.addStack(newName); newName = ""; showAdd = false }, enabled = newName.isNotBlank()) { Text("Add") }
                }
            }
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(stacks, key = { it.id }) { stack ->
                    MapStackCard(stack = stack, onClick = { onOpenStack(stack.id) }, onDelete = { vm.deleteStack(stack.id) })
                }
            }
        }
    }
}

@Composable
private fun MapStackCard(stack: MapStackEntity, onClick: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stack.icon.ifBlank { "📍" }, modifier = Modifier.padding(end = 8.dp))
            Text(stack.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
        }
    }
}
