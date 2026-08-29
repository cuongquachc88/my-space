package com.myspace.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material3.*
import androidx.compose.material3.SwipeToDismissBoxValue.EndToStart
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.MapStackEntity
import com.myspace.app.ui.GlassCard
import com.myspace.app.ui.GlowFab
import com.myspace.app.ui.RadialGlow
import com.myspace.app.ui.SectionHeader
import com.myspace.app.ui.theme.*
import com.myspace.app.ui.viewmodel.MapPinsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPinsScreen(
    onOpenStack: (String) -> Unit,
    onQrScan: () -> Unit,
    vm: MapPinsViewModel = hiltViewModel()
) {
    val stacks by vm.stacks.collectAsState()
    var showSheet by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = Background,
            topBar = {
                TopAppBar(
                    title = { Text("Map Pins", style = MaterialTheme.typography.headlineSmall, color = OnBackground) },
                    actions = {
                        IconButton(onClick = onQrScan) {
                            Icon(Icons.Default.QrCodeScanner, null, tint = OnSurfaceVariant)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
                )
            },
            floatingActionButton = {
                GlowFab(onClick = { showSheet = true }, accentColor = Primary) {
                    Icon(Icons.Rounded.Add, contentDescription = "New stack")
                }
            }
        ) { padding ->
            if (stacks.isEmpty()) {
                Box(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(56.dp),
                            tint = Primary.copy(alpha = 0.3f))
                        Text("No stacks yet", style = MaterialTheme.typography.titleSmall,
                            color = OnSurfaceVariant.copy(alpha = 0.5f))
                        Text("Tap + to create your first stack", style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceVariant.copy(alpha = 0.35f))
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(
                        start = 16.dp, end = 16.dp,
                        top = padding.calculateTopPadding() + 8.dp,
                        bottom = padding.calculateBottomPadding() + 80.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item { SectionHeader(title = "${stacks.size} STACKS", accentColor = Primary) }
                    items(stacks, key = { it.id }) { stack ->
                        val dismissState = rememberSwipeToDismissBoxState(
                            confirmValueChange = { v -> if (v == EndToStart) { vm.deleteStack(stack.id); true } else false }
                        )
                        SwipeToDismissBox(
                            state = dismissState,
                            enableDismissFromStartToEnd = false,
                            backgroundContent = {
                                Box(Modifier.fillMaxSize().padding(end = 20.dp), contentAlignment = Alignment.CenterEnd) {
                                    Icon(Icons.Default.Delete, null, tint = ErrorColor)
                                }
                            }
                        ) {
                            MapStackCard(stack = stack, onClick = { onOpenStack(stack.id) })
                        }
                    }
                }
            }
    }

    if (showSheet) {
        AddStackSheet(vm = vm, onDismiss = { showSheet = false })
    }
}

@Composable
private fun MapStackCard(stack: MapStackEntity, onClick: () -> Unit) {
    val accent = remember(stack.id) {
        listOf(Primary, Tertiary, Secondary)
            .getOrElse(stack.id.hashCode().and(0xFF) % 3) { Primary }
    }

    GlassCard(accentColor = accent) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(accent.copy(alpha = 0.3f), Color.Transparent)
                        ),
                        shape = MaterialTheme.shapes.medium
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(stack.icon.ifBlank { "📍" }, style = MaterialTheme.typography.titleMedium)
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(stack.name, style = MaterialTheme.typography.titleSmall, color = OnSurface,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Tap to view pins", style = MaterialTheme.typography.bodySmall,
                    color = accent.copy(alpha = 0.6f))
            }
            Icon(Icons.Default.ChevronRight, null, tint = OnSurfaceVariant.copy(alpha = 0.4f))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddStackSheet(vm: MapPinsViewModel, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = SurfaceContainerHigh) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("New Stack", style = MaterialTheme.typography.titleLarge, color = OnSurface)
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Stack name") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Primary, unfocusedBorderColor = Outline)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { vm.addStack(name); onDismiss() },
                    enabled = name.isNotBlank(),
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary, contentColor = OnPrimary)
                ) { Text("Create") }
            }
        }
    }
}
