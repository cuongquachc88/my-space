package com.myspace.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.TodoListEntity
import com.myspace.app.data.TodoTaskEntity
import com.myspace.app.ui.theme.AccentTodo
import com.myspace.app.ui.theme.BgCard
import com.myspace.app.ui.theme.BgCardBorder
import kotlinx.coroutines.launch
import java.util.UUID

// ── Color palette for lists ────────────────────────────────────────────────

private val listColorOptions = listOf(
    "#38BDF8", "#818CF8", "#34D399", "#FBBF24",
    "#F472B6", "#FB923C", "#A78BFA", "#60A5FA",
)

private fun parseHexColor(hex: String): Color = try {
    val clean = hex.trimStart('#')
    Color(("FF$clean").toLong(16))
} catch (_: Exception) { Color(0xFF38BDF8) }

// ── Priority helpers ───────────────────────────────────────────────────────

private fun priorityColor(priority: String): Color = when (priority) {
    "high"   -> Color(0xFFFC8181)
    "medium" -> Color(0xFFFBBF24)
    "low"    -> Color(0xFF34D399)
    else     -> Color(0x55FFFFFF)
}

private val PRIORITIES = listOf("low", "medium", "high")
private val RECURRENCES = listOf("none", "daily", "weekly", "monthly")

// ── Main screen ────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodoScreen(db: AppDatabase) {
    val scope = rememberCoroutineScope()

    var lists by remember { mutableStateOf<List<TodoListEntity>>(emptyList()) }
    var taskCounts by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var openList by remember { mutableStateOf<TodoListEntity?>(null) }

    // Add-list dialog state
    var showAddList by remember { mutableStateOf(false) }
    var newListName by remember { mutableStateOf("") }
    var newListColor by remember { mutableStateOf(listColorOptions.first()) }

    fun reloadLists() {
        scope.launch {
            lists = db.todoListDao().getAll()
            taskCounts = lists.associate { l ->
                l.id to db.todoTaskDao().getForList(l.id).count { !it.done }
            }
        }
    }

    LaunchedEffect(Unit) { reloadLists() }

    // If a list is open, show the task view
    val activeList = openList
    if (activeList != null) {
        TodoTasksView(
            db = db,
            list = activeList,
            onBack = { openList = null; reloadLists() },
        )
        return
    }

    // ── List-of-lists view ────────────────────────────────────────────────
    Box(Modifier.fillMaxSize()) {
        if (lists.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.CheckBox,
                        null,
                        tint = AccentTodo.copy(alpha = 0.25f),
                        modifier = Modifier.size(48.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "No to-do lists yet",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0x66FFFFFF),
                    )
                    Spacer(Modifier.height(6.dp))
                    Text("Tap + to create a list", fontSize = 13.sp, color = Color(0x44FFFFFF))
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 88.dp),
            ) {
                items(lists, key = { it.id }) { list ->
                    val pending = taskCounts[list.id] ?: 0
                    TodoListCard(
                        list = list,
                        pendingCount = pending,
                        onClick = { openList = list },
                        onDelete = {
                            scope.launch {
                                db.todoTaskDao().deleteForList(list.id)
                                db.todoListDao().delete(list.id)
                                reloadLists()
                            }
                        },
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = {
                newListName = ""; newListColor = listColorOptions.first()
                showAddList = true
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp),
            containerColor = AccentTodo,
            shape = RoundedCornerShape(16.dp),
        ) {
            Icon(Icons.Default.Add, "New list", tint = Color.White, modifier = Modifier.size(24.dp))
        }
    }

    // ── Add-list dialog ───────────────────────────────────────────────────
    if (showAddList) {
        AlertDialog(
            onDismissRequest = { showAddList = false },
            containerColor = Color(0xFF0D1117),
            title = {
                Text("New List", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(
                        value = newListName,
                        onValueChange = { newListName = it },
                        label = { Text("List name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = todoFieldColors(),
                    )
                    Text("Color", fontSize = 13.sp, color = Color(0x88FFFFFF))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        listColorOptions.take(4).forEach { hex ->
                            ColorDot(hex = hex, selected = newListColor == hex, onClick = { newListColor = hex })
                        }
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        listColorOptions.drop(4).forEach { hex ->
                            ColorDot(hex = hex, selected = newListColor == hex, onClick = { newListColor = hex })
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (newListName.isNotBlank()) {
                        scope.launch {
                            db.todoListDao().upsert(
                                TodoListEntity(
                                    id = UUID.randomUUID().toString(),
                                    name = newListName.trim(),
                                    color = newListColor,
                                    createdAt = System.currentTimeMillis(),
                                )
                            )
                            showAddList = false
                            reloadLists()
                        }
                    }
                }) {
                    Text("Create", fontWeight = FontWeight.SemiBold, color = AccentTodo)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddList = false }) {
                    Text("Cancel", color = Color(0x88FFFFFF))
                }
            },
        )
    }
}

// ── List card ──────────────────────────────────────────────────────────────

@Composable
private fun TodoListCard(
    list: TodoListEntity,
    pendingCount: Int,
    onClick: () -> Unit,
    onDelete: () -> Unit,
) {
    val accent = parseHexColor(list.color)
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(accent),
            )
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(list.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Text(
                    if (pendingCount == 0) "All done" else "$pendingCount pending",
                    fontSize = 12.sp,
                    color = if (pendingCount == 0) Color(0xFF34D399).copy(alpha = 0.7f) else Color(0x88FFFFFF),
                )
            }
            Icon(Icons.Default.ChevronRight, null, tint = Color(0x44FFFFFF), modifier = Modifier.size(20.dp))
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Delete, "Delete", tint = Color(0x44FFFFFF), modifier = Modifier.size(16.dp))
            }
        }
    }
}

// ── Task view (drill-in) ───────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TodoTasksView(
    db: AppDatabase,
    list: TodoListEntity,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val accent = parseHexColor(list.color)

    var tasks by remember { mutableStateOf<List<TodoTaskEntity>>(emptyList()) }

    // Add-task dialog state
    var showAddTask by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newNote by remember { mutableStateOf("") }
    var newPriority by remember { mutableStateOf("medium") }
    var newDueDate by remember { mutableStateOf("") }
    var newRecurrence by remember { mutableStateOf("none") }

    fun reloadTasks() {
        scope.launch { tasks = db.todoTaskDao().getForList(list.id) }
    }
    LaunchedEffect(Unit) { reloadTasks() }

    // Group by priority for display
    val highTasks   = tasks.filter { it.priority == "high"   && !it.done }
    val mediumTasks = tasks.filter { it.priority == "medium" && !it.done }
    val lowTasks    = tasks.filter { it.priority == "low"    && !it.done }
    val doneTasks   = tasks.filter { it.done }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 88.dp),
        ) {
            // Back + title header
            item {
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = Color(0xAAFFFFFF), modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(accent),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        list.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        "${tasks.count { !it.done }} left",
                        fontSize = 12.sp,
                        color = Color(0x66FFFFFF),
                    )
                }
            }

            if (tasks.isEmpty()) {
                item {
                    Box(
                        Modifier.fillMaxWidth().height(260.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.CheckCircleOutline,
                                null,
                                tint = accent.copy(alpha = 0.25f),
                                modifier = Modifier.size(44.dp),
                            )
                            Spacer(Modifier.height(12.dp))
                            Text("No tasks yet", fontSize = 16.sp, color = Color(0x66FFFFFF))
                            Spacer(Modifier.height(4.dp))
                            Text("Tap + to add a task", fontSize = 13.sp, color = Color(0x44FFFFFF))
                        }
                    }
                }
            }

            // High priority
            if (highTasks.isNotEmpty()) {
                item { PriorityHeader("High", Color(0xFFFC8181)) }
                items(highTasks, key = { it.id }) { task ->
                    TaskRow(task = task, accent = accent, onToggle = {
                        scope.launch {
                            db.todoTaskDao().upsert(task.copy(done = !task.done, updatedAt = System.currentTimeMillis()))
                            reloadTasks()
                        }
                    }, onDelete = {
                        scope.launch { db.todoTaskDao().delete(task.id); reloadTasks() }
                    })
                }
            }

            // Medium priority
            if (mediumTasks.isNotEmpty()) {
                item { PriorityHeader("Medium", Color(0xFFFBBF24)) }
                items(mediumTasks, key = { it.id }) { task ->
                    TaskRow(task = task, accent = accent, onToggle = {
                        scope.launch {
                            db.todoTaskDao().upsert(task.copy(done = !task.done, updatedAt = System.currentTimeMillis()))
                            reloadTasks()
                        }
                    }, onDelete = {
                        scope.launch { db.todoTaskDao().delete(task.id); reloadTasks() }
                    })
                }
            }

            // Low priority
            if (lowTasks.isNotEmpty()) {
                item { PriorityHeader("Low", Color(0xFF34D399)) }
                items(lowTasks, key = { it.id }) { task ->
                    TaskRow(task = task, accent = accent, onToggle = {
                        scope.launch {
                            db.todoTaskDao().upsert(task.copy(done = !task.done, updatedAt = System.currentTimeMillis()))
                            reloadTasks()
                        }
                    }, onDelete = {
                        scope.launch { db.todoTaskDao().delete(task.id); reloadTasks() }
                    })
                }
            }

            // Done
            if (doneTasks.isNotEmpty()) {
                item { PriorityHeader("Done", Color(0x55FFFFFF)) }
                items(doneTasks, key = { it.id }) { task ->
                    TaskRow(task = task, accent = accent, onToggle = {
                        scope.launch {
                            db.todoTaskDao().upsert(task.copy(done = !task.done, updatedAt = System.currentTimeMillis()))
                            reloadTasks()
                        }
                    }, onDelete = {
                        scope.launch { db.todoTaskDao().delete(task.id); reloadTasks() }
                    })
                }
            }
        }

        FloatingActionButton(
            onClick = {
                newTitle = ""; newNote = ""; newPriority = "medium"
                newDueDate = ""; newRecurrence = "none"
                showAddTask = true
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp),
            containerColor = accent,
            shape = RoundedCornerShape(16.dp),
        ) {
            Icon(Icons.Default.Add, "New task", tint = Color.White, modifier = Modifier.size(24.dp))
        }
    }

    // ── Add-task dialog ────────────────────────────────────────────────────
    if (showAddTask) {
        AlertDialog(
            onDismissRequest = { showAddTask = false },
            containerColor = Color(0xFF0D1117),
            title = {
                Text("New Task", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        label = { Text("Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = todoFieldColors(),
                    )
                    OutlinedTextField(
                        value = newNote,
                        onValueChange = { newNote = it },
                        label = { Text("Note (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = todoFieldColors(),
                        maxLines = 3,
                    )
                    OutlinedTextField(
                        value = newDueDate,
                        onValueChange = { newDueDate = it },
                        label = { Text("Due date (yyyy-MM-dd)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = todoFieldColors(),
                        placeholder = { Text("2025-12-31", color = Color(0x44FFFFFF), fontSize = 13.sp) },
                    )
                    Text("Priority", fontSize = 13.sp, color = Color(0x88FFFFFF))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PRIORITIES.forEach { p ->
                            FilterChip(
                                selected = newPriority == p,
                                onClick = { newPriority = p },
                                label = { Text(p.replaceFirstChar { it.uppercase() }, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = priorityColor(p).copy(alpha = 0.2f),
                                    selectedLabelColor = priorityColor(p),
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = newPriority == p,
                                    selectedBorderColor = priorityColor(p).copy(0.5f),
                                    borderColor = BgCardBorder,
                                ),
                            )
                        }
                    }
                    Text("Recurrence", fontSize = 13.sp, color = Color(0x88FFFFFF))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        RECURRENCES.forEach { r ->
                            FilterChip(
                                selected = newRecurrence == r,
                                onClick = { newRecurrence = r },
                                label = { Text(r.replaceFirstChar { it.uppercase() }, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = accent.copy(alpha = 0.2f),
                                    selectedLabelColor = accent,
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = newRecurrence == r,
                                    selectedBorderColor = accent.copy(0.5f),
                                    borderColor = BgCardBorder,
                                ),
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (newTitle.isNotBlank()) {
                        val now = System.currentTimeMillis()
                        scope.launch {
                            db.todoTaskDao().upsert(
                                TodoTaskEntity(
                                    id = UUID.randomUUID().toString(),
                                    listId = list.id,
                                    title = newTitle.trim(),
                                    note = newNote.trim(),
                                    priority = newPriority,
                                    dueDate = newDueDate.trim().ifBlank { null },
                                    recurrence = newRecurrence,
                                    done = false,
                                    createdAt = now,
                                    updatedAt = now,
                                )
                            )
                            showAddTask = false
                            reloadTasks()
                        }
                    }
                }) {
                    Text("Add", fontWeight = FontWeight.SemiBold, color = accent)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddTask = false }) {
                    Text("Cancel", color = Color(0x88FFFFFF))
                }
            },
        )
    }
}

// ── Sub-composables ───────────────────────────────────────────────────────

@Composable
private fun PriorityHeader(label: String, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(top = 4.dp),
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(14.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
            letterSpacing = 0.5.sp,
        )
    }
}

@Composable
private fun TaskRow(
    task: TodoTaskEntity,
    accent: Color,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
) {
    val dimAlpha = if (task.done) 0.4f else 1f
    Card(
        colors = CardDefaults.cardColors(containerColor = BgCard.copy(alpha = if (task.done) 0.5f else 1f)),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(
                checked = task.done,
                onCheckedChange = { onToggle() },
                colors = CheckboxDefaults.colors(
                    checkedColor = accent,
                    uncheckedColor = Color(0x55FFFFFF),
                    checkmarkColor = Color.White,
                ),
                modifier = Modifier.size(24.dp),
            )
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    task.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = dimAlpha),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    // Priority badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(priorityColor(task.priority).copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            task.priority,
                            fontSize = 10.sp,
                            color = priorityColor(task.priority).copy(alpha = dimAlpha),
                        )
                    }
                    // Due date chip
                    if (!task.dueDate.isNullOrBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(0x15FFFFFF))
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        ) {
                            Text(
                                task.dueDate,
                                fontSize = 10.sp,
                                color = Color(0x88FFFFFF).copy(alpha = dimAlpha),
                            )
                        }
                    }
                    // Recurrence
                    if (task.recurrence != "none") {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(accent.copy(alpha = 0.10f))
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        ) {
                            Text(
                                task.recurrence,
                                fontSize = 10.sp,
                                color = accent.copy(alpha = dimAlpha * 0.8f),
                            )
                        }
                    }
                }
                if (task.note.isNotBlank()) {
                    Text(
                        task.note,
                        fontSize = 12.sp,
                        color = Color(0x66FFFFFF).copy(alpha = dimAlpha),
                        lineHeight = 16.sp,
                    )
                }
            }
            IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.Delete, "Delete", tint = Color(0x44FFFFFF), modifier = Modifier.size(15.dp))
            }
        }
    }
}

@Composable
private fun ColorDot(hex: String, selected: Boolean, onClick: () -> Unit) {
    val color = parseHexColor(hex)
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(CircleShape)
            .background(color.copy(alpha = 0.85f))
            .then(
                if (selected) Modifier.border(2.dp, Color.White, CircleShape)
                else Modifier.border(2.dp, Color.Transparent, CircleShape)
            )
            .clickable { onClick() },
    )
}

@Composable
private fun todoFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AccentTodo.copy(alpha = 0.7f),
    unfocusedBorderColor = BgCardBorder,
    focusedContainerColor = BgCard,
    unfocusedContainerColor = BgCard,
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedLabelColor = AccentTodo,
    unfocusedLabelColor = Color(0x88FFFFFF),
)
