package com.myspace.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.MapPinEntity
import com.myspace.app.ui.theme.DarkBackground
import com.myspace.app.ui.viewmodel.MapPinsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPinStackScreen(stackId: String, onBack: () -> Unit, vm: MapPinsViewModel = hiltViewModel()) {
    val pins by vm.pinsFor(stackId).collectAsState()
    var showAdd by remember { mutableStateOf(false) }
    var newLabel by remember { mutableStateOf("") }
    var newUrl by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Pins") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground),
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = { IconButton(onClick = { showAdd = !showAdd }) { Icon(Icons.Default.Add, "Add pin") } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (showAdd) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Paste a map URL to extract coordinates", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    OutlinedTextField(value = newLabel, onValueChange = { newLabel = it }, label = { Text("Label") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = newUrl, onValueChange = { newUrl = it }, label = { Text("Map URL (Google, OSM, Bing, Apple)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { showAdd = false }, modifier = Modifier.weight(1f)) { Text("Cancel") }
                        Button(
                            onClick = { vm.addPinFromUrl(stackId, newLabel, newUrl); newLabel = ""; newUrl = ""; showAdd = false },
                            enabled = newLabel.isNotBlank() && newUrl.isNotBlank(),
                            modifier = Modifier.weight(1f)
                        ) { Text("Add Pin") }
                    }
                }
            }
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(pins, key = { it.id }) { pin ->
                    MapPinCard(pin = pin, onDelete = { vm.deletePin(pin.id) })
                }
            }
        }
    }
}

@Composable
private fun MapPinCard(pin: MapPinEntity, onDelete: () -> Unit) {
    val uriHandler = LocalUriHandler.current
    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(pin.label, style = MaterialTheme.typography.titleSmall)
                Text("${pin.lat}, ${pin.lng}", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                if (pin.note.isNotBlank())
                    Text(pin.note, style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), maxLines = 1)
            }
            if (pin.url.isNotBlank()) {
                IconButton(onClick = { uriHandler.openUri(pin.url) }) { Icon(Icons.Default.OpenInNew, "Open map", tint = MaterialTheme.colorScheme.primary) }
            }
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
        }
    }
}
