package com.myspace.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material3.*
import androidx.compose.material3.SwipeToDismissBoxValue.EndToStart
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.TodoTaskEntity
import com.myspace.app.ui.viewmodel.TodosViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodoTasksScreen(listId: String, onBack: () -> Unit, vm: TodosViewModel = hiltViewModel()) {
    val tasks by vm.tasksFor(listId).collectAsState()
    var showSheet by remember { mutableStateOf(false) }

    val overdue = tasks.filter { !it.done && it.dueDate != null && it.dueDate < System.currentTimeMillis() }
    val today = tasks.filter {
        if (it.done || it.dueDate == null) return@filter false
        val now = System.currentTimeMillis()
        val dayMs = 86_400_000L
        it.dueDate >= now && it.dueDate < now + dayMs
    }
    val upcoming = tasks.filter { !it.done && it.dueDate != null && !overdue.contains(it) && !today.contains(it) }
    val noDate = tasks.filter { !it.done && it.dueDate == null }
    val done = tasks.filter { it.done }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tasks", style = MaterialTheme.typography.headlineSmall) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showSheet = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "Add task")
            }
        }
    ) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(
                start = 16.dp, end = 16.dp,
                top = padding.calculateTopPadding() + 4.dp,
                bottom = padding.calculateBottomPadding() + 80.dp
            ),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            @Composable fun SectionHeader(label: String, tint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurfaceVariant) {
                Text(label, style = MaterialTheme.typography.labelMedium, color = tint, modifier = Modifier.padding(top = 8.dp, bottom = 2.dp))
            }

            if (overdue.isNotEmpty()) {
                item { SectionHeader("Overdue", MaterialTheme.colorScheme.error) }
                items(overdue, key = { it.id }) { task ->
                    DismissableTaskCard(task, vm)
                }
            }
            if (today.isNotEmpty()) {
                item { SectionHeader("Today", MaterialTheme.colorScheme.secondary) }
                items(today, key = { it.id }) { task ->
                    DismissableTaskCard(task, vm)
                }
            }
            if (upcoming.isNotEmpty()) {
                item { SectionHeader("Upcoming") }
                items(upcoming, key = { it.id }) { task ->
                    DismissableTaskCard(task, vm)
                }
            }
            if (noDate.isNotEmpty()) {
                item { SectionHeader("No date") }
                items(noDate, key = { it.id }) { task ->
                    DismissableTaskCard(task, vm)
                }
            }
            if (done.isNotEmpty()) {
                item { SectionHeader("Done") }
                items(done, key = { it.id }) { task ->
                    DismissableTaskCard(task, vm)
                }
            }
        }
    }

    if (showSheet) {
        AddTaskSheet(listId = listId, vm = vm, onDismiss = { showSheet = false })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DismissableTaskCard(task: TodoTaskEntity, vm: TodosViewModel) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { v -> if (v == EndToStart) { vm.deleteTask(task.id); true } else false }
    )
    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(Modifier.fillMaxSize().padding(end = 20.dp), contentAlignment = Alignment.CenterEnd) {
                Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error)
            }
        }
    ) {
        TaskCard(task = task, onToggle = { vm.toggleTask(task) })
    }
}

@Composable
private fun TaskCard(task: TodoTaskEntity, onToggle: () -> Unit) {
    val priorityColor = when (task.priority) {
        "high"   -> MaterialTheme.colorScheme.error
        "medium" -> MaterialTheme.colorScheme.secondary
        else     -> MaterialTheme.colorScheme.outlineVariant
    }

    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        )
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Priority strip
            Surface(
                modifier = Modifier.width(4.dp).fillMaxHeight(),
                color = priorityColor
            ) {}
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Checkbox(
                    checked = task.done,
                    onCheckedChange = { onToggle() },
                    colors = CheckboxDefaults.colors(
                        checkedColor = MaterialTheme.colorScheme.primary
                    )
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        task.title,
                        style = if (task.done)
                            MaterialTheme.typography.bodyMedium.copy(textDecoration = TextDecoration.LineThrough)
                        else
                            MaterialTheme.typography.bodyMedium,
                        color = if (task.done)
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        else
                            MaterialTheme.colorScheme.onSurface
                    )
                    if (task.note.isNotBlank()) {
                        Text(
                            task.note,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddTaskSheet(listId: String, vm: TodosViewModel, onDismiss: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("medium") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Add Task", style = MaterialTheme.typography.titleLarge)
            OutlinedTextField(
                value = title, onValueChange = { title = it },
                label = { Text("Task title") }, singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Text("Priority", style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("low", "medium", "high").forEach { p ->
                    FilterChip(
                        selected = priority == p,
                        onClick = { priority = p },
                        label = { Text(p.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { vm.addTask(listId, title, priority, null); onDismiss() },
                    enabled = title.isNotBlank(),
                    modifier = Modifier.weight(1f)
                ) { Text("Add") }
            }
        }
    }
}
