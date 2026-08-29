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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.TodoListEntity
import com.myspace.app.ui.GlassCard
import com.myspace.app.ui.GlowFab
import com.myspace.app.ui.RadialGlow
import com.myspace.app.ui.SectionHeader
import com.myspace.app.ui.theme.*
import com.myspace.app.ui.viewmodel.TodosViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodosScreen(onOpenList: (String) -> Unit, vm: TodosViewModel = hiltViewModel()) {
    val lists by vm.lists.collectAsState()
    var showSheet by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = { Text("To-Do Lists", style = MaterialTheme.typography.headlineSmall, color = OnBackground) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
            )
        },
        floatingActionButton = {
            GlowFab(onClick = { showSheet = true }, accentColor = Primary) {
                Icon(Icons.Rounded.Add, contentDescription = "New list")
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (lists.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CheckBox, null, modifier = Modifier.size(56.dp),
                            tint = Primary.copy(alpha = 0.3f))
                        Text("No lists yet", style = MaterialTheme.typography.titleSmall,
                            color = OnSurfaceVariant.copy(alpha = 0.5f))
                        Text("Tap + to create your first list", style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceVariant.copy(alpha = 0.35f))
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item { SectionHeader(title = "${lists.size} LISTS", accentColor = Primary) }
                    items(lists, key = { it.id }) { list ->
                        val dismissState = rememberSwipeToDismissBoxState(
                            confirmValueChange = { v -> if (v == EndToStart) { vm.deleteList(list.id); true } else false }
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
                            TodoListCard(list = list, onClick = { onOpenList(list.id) })
                        }
                    }
                }
            }
        } // Box
    } // Scaffold

    if (showSheet) {
        AddListSheet(vm = vm, onDismiss = { showSheet = false })
    }
}

@Composable
private fun TodoListCard(list: TodoListEntity, onClick: () -> Unit) {
    // Derive accent from list color string or use cycle through palette
    val accent = remember(list.id) {
        listOf(Primary, Secondary, Tertiary, OnPrimaryContainer)
            .getOrElse(list.id.hashCode().and(0xFF) % 4) { Primary }
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
            // Icon badge with glow
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(accent.copy(alpha = 0.25f), Color.Transparent)
                        ),
                        shape = MaterialTheme.shapes.medium
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(list.icon.ifBlank { "📋" }, style = MaterialTheme.typography.titleMedium)
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(list.name, style = MaterialTheme.typography.titleSmall, color = OnSurface)
                Text(
                    "Tap to open",
                    style = MaterialTheme.typography.bodySmall,
                    color = accent.copy(alpha = 0.6f)
                )
            }
            Icon(Icons.Default.ChevronRight, null, tint = OnSurfaceVariant.copy(alpha = 0.4f))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddListSheet(vm: TodosViewModel, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = SurfaceContainerHigh) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("New List", style = MaterialTheme.typography.titleLarge, color = OnSurface)
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("List name") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.large,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Primary, unfocusedBorderColor = Outline)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { vm.addList(name); onDismiss() },
                    enabled = name.isNotBlank(),
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary, contentColor = OnPrimary)
                ) { Text("Create") }
            }
        }
    }
}
