package com.myspace.app.ui.screen

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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.TodoTaskEntity
import com.myspace.app.ui.viewmodel.TodosViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodoTasksScreen(
    listId: String,
    onBack: () -> Unit,
    vm: TodosViewModel = hiltViewModel()
) {
    val tasks by vm.tasksFor(listId).collectAsState()
    val lists by vm.lists.collectAsState()
    val listName = lists.find { it.id == listId }?.name ?: "Tasks"

    var showDialog by remember { mutableStateOf(false) }
    var newTaskTitle by remember { mutableStateOf("") }
    var newTaskPriority by remember { mutableStateOf("low") }

    val now = System.currentTimeMillis()
    val todayStart = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0)
    }.timeInMillis
    val tomorrowStart = todayStart + 86_400_000L

    val overdue   = tasks.filter { !it.done && it.dueDate != null && it.dueDate < todayStart }
    val today     = tasks.filter { !it.done && it.dueDate != null && it.dueDate in todayStart until tomorrowStart }
    val upcoming  = tasks.filter { !it.done && it.dueDate != null && it.dueDate >= tomorrowStart }
    val noDate    = tasks.filter { !it.done && it.dueDate == null }
    val done      = tasks.filter { it.done }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(listName) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) { Icon(Icons.Default.Add, contentDescription = "Add task") }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            fun sectionHeader(label: String, count: Int) {
                item {
                    Text(
                        "$label ($count)",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp)
                    )
                }
            }

            if (overdue.isNotEmpty()) {
                sectionHeader("Overdue", overdue.size)
                items(overdue, key = { it.id }) { task ->
                    TaskCard(task, vm, sectionColor = MaterialTheme.colorScheme.error)
                }
            }
            if (today.isNotEmpty()) {
                sectionHeader("Today", today.size)
                items(today, key = { it.id }) { task ->
                    TaskCard(task, vm, sectionColor = MaterialTheme.colorScheme.primary)
                }
            }
            if (upcoming.isNotEmpty()) {
                sectionHeader("Upcoming", upcoming.size)
                items(upcoming, key = { it.id }) { task ->
                    TaskCard(task, vm, sectionColor = MaterialTheme.colorScheme.tertiary)
                }
            }
            if (noDate.isNotEmpty()) {
                sectionHeader("No date", noDate.size)
                items(noDate, key = { it.id }) { task ->
                    TaskCard(task, vm, sectionColor = MaterialTheme.colorScheme.outline)
                }
            }
            if (done.isNotEmpty()) {
                sectionHeader("Done", done.size)
                items(done, key = { it.id }) { task ->
                    TaskCard(task, vm, sectionColor = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false; newTaskTitle = "" },
            title = { Text("New task") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = newTaskTitle,
                        onValueChange = { newTaskTitle = it },
                        label = { Text("Task title") },
                        singleLine = true,
                        shape = MaterialTheme.shapes.medium,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("low", "medium", "high").forEach { p ->
                            FilterChip(
                                selected = newTaskPriority == p,
                                onClick = { newTaskPriority = p },
                                label = { Text(p.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (newTaskTitle.isNotBlank()) {
                        vm.addTask(listId, newTaskTitle.trim(), newTaskPriority, null)
                        newTaskTitle = ""
                        showDialog = false
                    }
                }) { Text("Create") }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false; newTaskTitle = "" }) { Text("Cancel") }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskCard(task: TodoTaskEntity, vm: TodosViewModel, sectionColor: Color) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) { vm.deleteTask(task.id); true }
            else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(Modifier.fillMaxSize().padding(end = 20.dp), contentAlignment = Alignment.CenterEnd) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            }
        }
    ) {
        ElevatedCard(
            shape = MaterialTheme.shapes.medium,
            colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(Modifier.fillMaxWidth()) {
                // Priority strip
                Box(
                    Modifier
                        .width(4.dp)
                        .background(priorityColor(task.priority, sectionColor))
                        .fillMaxHeight()
                        .defaultMinSize(minHeight = 56.dp)
                )
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Checkbox(
                        checked = task.done,
                        onCheckedChange = { vm.toggleTask(task) }
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = task.title,
                            style = if (task.done)
                                MaterialTheme.typography.bodyMedium.copy(textDecoration = TextDecoration.LineThrough)
                            else MaterialTheme.typography.bodyMedium,
                            color = if (task.done) MaterialTheme.colorScheme.onSurfaceVariant
                            else MaterialTheme.colorScheme.onSurface
                        )
                        task.dueDate?.let { due ->
                            Text(
                                SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(due)),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun priorityColor(priority: String, fallback: Color): Color = when (priority) {
    "high"   -> MaterialTheme.colorScheme.error
    "medium" -> MaterialTheme.colorScheme.secondary
    "low"    -> MaterialTheme.colorScheme.primary
    else     -> fallback
}
