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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.TodoTaskEntity
import com.myspace.app.ui.theme.Accent
import com.myspace.app.ui.theme.DarkBackground
import com.myspace.app.ui.viewmodel.TodosViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodoTasksScreen(listId: String, onBack: () -> Unit, vm: TodosViewModel = hiltViewModel()) {
    val tasks by vm.tasksFor(listId).collectAsState()
    var showAdd by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Tasks") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground),
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = { IconButton(onClick = { showAdd = !showAdd }) { Icon(Icons.Default.Add, "Add task") } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (showAdd) {
                Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newTitle, onValueChange = { newTitle = it }, label = { Text("Task title") }, singleLine = true, modifier = Modifier.weight(1f))
                    Button(onClick = { vm.addTask(listId, newTitle, "medium", null); newTitle = ""; showAdd = false }, enabled = newTitle.isNotBlank()) { Text("Add") }
                }
            }
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tasks, key = { it.id }) { task ->
                    TaskCard(task = task, onToggle = { vm.toggleTask(task) }, onDelete = { vm.deleteTask(task.id) })
                }
            }
        }
    }
}

@Composable
private fun TaskCard(task: TodoTaskEntity, onToggle: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = task.done, onCheckedChange = { onToggle() }, colors = CheckboxDefaults.colors(checkedColor = Accent))
            Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                Text(task.title, style = MaterialTheme.typography.bodyMedium,
                    color = if (task.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    else MaterialTheme.colorScheme.onSurface)
                PriorityBadge(task.priority)
            }
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun PriorityBadge(priority: String) {
    val color = when (priority) {
        "high" -> MaterialTheme.colorScheme.error
        "medium" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
    }
    Text(priority, style = MaterialTheme.typography.labelSmall, color = color)
}
