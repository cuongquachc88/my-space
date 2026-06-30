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
import com.myspace.app.data.MapPinEntity
import com.myspace.app.data.MapStackEntity
import com.myspace.app.ui.theme.AccentMaps
import com.myspace.app.ui.theme.BgCard
import com.myspace.app.ui.theme.BgCardBorder
import kotlinx.coroutines.launch
import java.util.UUID

// ── Constants ─────────────────────────────────────────────────────────────

private val stackColorOptions = listOf(
    "#FB923C", "#F472B6", "#34D399", "#FBBF24",
    "#818CF8", "#38BDF8", "#60A5FA", "#A78BFA",
)

private val PIN_CATEGORIES = listOf("Hotel", "Restaurant", "Café", "Attraction", "Shopping", "Other")
private val PIN_PRIORITIES = listOf("none", "low", "medium", "high")

private fun pinPriorityColor(priority: String): Color = when (priority) {
    "high"   -> Color(0xFFFC8181)
    "medium" -> Color(0xFFFBBF24)
    "low"    -> Color(0xFF34D399)
    else     -> Color(0x44FFFFFF)
}

private fun parseStackColor(hex: String): Color = try {
    val clean = hex.trimStart('#')
    Color(("FF$clean").toLong(16))
} catch (_: Exception) { Color(0xFFFB923C) }

// ── Main screen ────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPinsScreen(db: AppDatabase) {
    val scope = rememberCoroutineScope()

    var stacks by remember { mutableStateOf<List<MapStackEntity>>(emptyList()) }
    var pinCounts by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var openStack by remember { mutableStateOf<MapStackEntity?>(null) }

    // Add-stack dialog state
    var showAddStack by remember { mutableStateOf(false) }
    var newStackName by remember { mutableStateOf("") }
    var newStackColor by remember { mutableStateOf(stackColorOptions.first()) }

    fun reloadStacks() {
        scope.launch {
            stacks = db.mapStackDao().getAll()
            pinCounts = stacks.associate { s ->
                s.id to db.mapPinDao().getForStack(s.id).size
            }
        }
    }

    LaunchedEffect(Unit) { reloadStacks() }

    // If a stack is open, show pins view
    val activeStack = openStack
    if (activeStack != null) {
        MapPinsStackView(
            db = db,
            stack = activeStack,
            onBack = { openStack = null; reloadStacks() },
        )
        return
    }

    // ── List-of-stacks view ───────────────────────────────────────────────
    Box(Modifier.fillMaxSize()) {
        if (stacks.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.LocationOn,
                        null,
                        tint = AccentMaps.copy(alpha = 0.25f),
                        modifier = Modifier.size(48.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "No map stacks yet",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0x66FFFFFF),
                    )
                    Spacer(Modifier.height(6.dp))
                    Text("Tap + to create a stack", fontSize = 13.sp, color = Color(0x44FFFFFF))
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
                items(stacks, key = { it.id }) { stack ->
                    val count = pinCounts[stack.id] ?: 0
                    MapStackCard(
                        stack = stack,
                        pinCount = count,
                        onClick = { openStack = stack },
                        onDelete = {
                            scope.launch {
                                db.mapPinDao().deleteForStack(stack.id)
                                db.mapStackDao().delete(stack.id)
                                reloadStacks()
                            }
                        },
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = {
                newStackName = ""; newStackColor = stackColorOptions.first()
                showAddStack = true
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp),
            containerColor = AccentMaps,
            shape = RoundedCornerShape(16.dp),
        ) {
            Icon(Icons.Default.Add, "New stack", tint = Color.White, modifier = Modifier.size(24.dp))
        }
    }

    // ── Add-stack dialog ───────────────────────────────────────────────────
    if (showAddStack) {
        AlertDialog(
            onDismissRequest = { showAddStack = false },
            containerColor = Color(0xFF0D1117),
            title = {
                Text("New Stack", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(
                        value = newStackName,
                        onValueChange = { newStackName = it },
                        label = { Text("Stack name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = mapsFieldColors(),
                    )
                    Text("Color", fontSize = 13.sp, color = Color(0x88FFFFFF))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        stackColorOptions.take(4).forEach { hex ->
                            MapColorDot(hex = hex, selected = newStackColor == hex, onClick = { newStackColor = hex })
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        stackColorOptions.drop(4).forEach { hex ->
                            MapColorDot(hex = hex, selected = newStackColor == hex, onClick = { newStackColor = hex })
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (newStackName.isNotBlank()) {
                        scope.launch {
                            db.mapStackDao().upsert(
                                MapStackEntity(
                                    id = UUID.randomUUID().toString(),
                                    name = newStackName.trim(),
                                    color = newStackColor,
                                    createdAt = System.currentTimeMillis(),
                                )
                            )
                            showAddStack = false
                            reloadStacks()
                        }
                    }
                }) {
                    Text("Create", fontWeight = FontWeight.SemiBold, color = AccentMaps)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddStack = false }) {
                    Text("Cancel", color = Color(0x88FFFFFF))
                }
            },
        )
    }
}

// ── Stack card ─────────────────────────────────────────────────────────────

@Composable
private fun MapStackCard(
    stack: MapStackEntity,
    pinCount: Int,
    onClick: () -> Unit,
    onDelete: () -> Unit,
) {
    val accent = parseStackColor(stack.color)
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
                Text(stack.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Text(
                    "$pinCount pin${if (pinCount != 1) "s" else ""}",
                    fontSize = 12.sp,
                    color = Color(0x88FFFFFF),
                )
            }
            Icon(Icons.Default.ChevronRight, null, tint = Color(0x44FFFFFF), modifier = Modifier.size(20.dp))
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Delete, "Delete", tint = Color(0x44FFFFFF), modifier = Modifier.size(16.dp))
            }
        }
    }
}

// ── Pins drill-in view ─────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MapPinsStackView(
    db: AppDatabase,
    stack: MapStackEntity,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val accent = parseStackColor(stack.color)

    var pins by remember { mutableStateOf<List<MapPinEntity>>(emptyList()) }

    // Add-pin dialog state
    var showAddPin by remember { mutableStateOf(false) }
    var newLabel by remember { mutableStateOf("") }
    var newLat by remember { mutableStateOf("") }
    var newLng by remember { mutableStateOf("") }
    var newNote by remember { mutableStateOf("") }
    var newCategory by remember { mutableStateOf(PIN_CATEGORIES.first()) }
    var newPriority by remember { mutableStateOf("none") }

    fun reloadPins() {
        scope.launch { pins = db.mapPinDao().getForStack(stack.id) }
    }
    LaunchedEffect(Unit) { reloadPins() }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
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
                        stack.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        "${pins.size} pin${if (pins.size != 1) "s" else ""}",
                        fontSize = 12.sp,
                        color = Color(0x66FFFFFF),
                    )
                }
            }

            if (pins.isEmpty()) {
                item {
                    Box(
                        Modifier.fillMaxWidth().height(260.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.PinDrop,
                                null,
                                tint = accent.copy(alpha = 0.25f),
                                modifier = Modifier.size(44.dp),
                            )
                            Spacer(Modifier.height(12.dp))
                            Text("No pins yet", fontSize = 16.sp, color = Color(0x66FFFFFF))
                            Spacer(Modifier.height(4.dp))
                            Text("Tap + to add a pin", fontSize = 13.sp, color = Color(0x44FFFFFF))
                        }
                    }
                }
            } else {
                items(pins, key = { it.id }) { pin ->
                    PinRow(
                        pin = pin,
                        accent = accent,
                        onDelete = {
                            scope.launch { db.mapPinDao().delete(pin.id); reloadPins() }
                        },
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = {
                newLabel = ""; newLat = ""; newLng = ""
                newNote = ""; newCategory = PIN_CATEGORIES.first(); newPriority = "none"
                showAddPin = true
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp),
            containerColor = accent,
            shape = RoundedCornerShape(16.dp),
        ) {
            Icon(Icons.Default.Add, "New pin", tint = Color.White, modifier = Modifier.size(24.dp))
        }
    }

    // ── Add-pin dialog ─────────────────────────────────────────────────────
    if (showAddPin) {
        AlertDialog(
            onDismissRequest = { showAddPin = false },
            containerColor = Color(0xFF0D1117),
            title = {
                Text("New Pin", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = newLabel,
                        onValueChange = { newLabel = it },
                        label = { Text("Label") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = mapsFieldColors(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = newLat,
                            onValueChange = { newLat = it },
                            label = { Text("Latitude") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = mapsFieldColors(),
                            placeholder = { Text("21.0285", color = Color(0x44FFFFFF), fontSize = 12.sp) },
                        )
                        OutlinedTextField(
                            value = newLng,
                            onValueChange = { newLng = it },
                            label = { Text("Longitude") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = mapsFieldColors(),
                            placeholder = { Text("105.8412", color = Color(0x44FFFFFF), fontSize = 12.sp) },
                        )
                    }
                    OutlinedTextField(
                        value = newNote,
                        onValueChange = { newNote = it },
                        label = { Text("Note (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = mapsFieldColors(),
                        maxLines = 2,
                    )

                    // Category dropdown
                    var catExpanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = catExpanded,
                        onExpandedChange = { catExpanded = it },
                    ) {
                        OutlinedTextField(
                            value = newCategory,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Category") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(catExpanded) },
                            shape = RoundedCornerShape(12.dp),
                            colors = mapsFieldColors(),
                            singleLine = true,
                        )
                        ExposedDropdownMenu(
                            expanded = catExpanded,
                            onDismissRequest = { catExpanded = false },
                        ) {
                            PIN_CATEGORIES.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat) },
                                    onClick = { newCategory = cat; catExpanded = false },
                                )
                            }
                        }
                    }

                    // Priority selector
                    Text("Priority", fontSize = 13.sp, color = Color(0x88FFFFFF))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        PIN_PRIORITIES.forEach { p ->
                            FilterChip(
                                selected = newPriority == p,
                                onClick = { newPriority = p },
                                label = { Text(p.replaceFirstChar { it.uppercase() }, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = pinPriorityColor(p).copy(alpha = 0.2f),
                                    selectedLabelColor = pinPriorityColor(p),
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = newPriority == p,
                                    selectedBorderColor = pinPriorityColor(p).copy(0.5f),
                                    borderColor = BgCardBorder,
                                ),
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val lat = newLat.toDoubleOrNull()
                    val lng = newLng.toDoubleOrNull()
                    if (newLabel.isNotBlank() && lat != null && lng != null) {
                        scope.launch {
                            db.mapPinDao().upsert(
                                MapPinEntity(
                                    id = UUID.randomUUID().toString(),
                                    stackId = stack.id,
                                    label = newLabel.trim(),
                                    lat = lat,
                                    lng = lng,
                                    note = newNote.trim(),
                                    category = newCategory,
                                    priority = newPriority,
                                    rating = 0,
                                    createdAt = System.currentTimeMillis(),
                                )
                            )
                            showAddPin = false
                            reloadPins()
                        }
                    }
                }) {
                    Text("Add", fontWeight = FontWeight.SemiBold, color = accent)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddPin = false }) {
                    Text("Cancel", color = Color(0x88FFFFFF))
                }
            },
        )
    }
}

// ── Pin row ────────────────────────────────────────────────────────────────

@Composable
private fun PinRow(
    pin: MapPinEntity,
    accent: Color,
    onDelete: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    null,
                    tint = accent,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    pin.label,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Delete, "Delete", tint = Color(0x44FFFFFF), modifier = Modifier.size(15.dp))
                }
            }
            Spacer(Modifier.height(6.dp))

            // Coordinates
            Text(
                "${"%.5f".format(pin.lat)}, ${"%.5f".format(pin.lng)}",
                fontSize = 11.sp,
                color = Color(0x66FFFFFF),
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
            )

            Spacer(Modifier.height(6.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Priority badge
                if (pin.priority != "none") {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(pinPriorityColor(pin.priority).copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(pin.priority, fontSize = 10.sp, color = pinPriorityColor(pin.priority))
                    }
                }
                // Category chip
                if (pin.category.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(accent.copy(alpha = 0.10f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(pin.category, fontSize = 10.sp, color = accent.copy(alpha = 0.8f))
                    }
                }
                // Star rating
                if (pin.rating > 0) {
                    Row {
                        repeat(5) { i ->
                            Text(
                                if (i < pin.rating) "★" else "☆",
                                fontSize = 12.sp,
                                color = if (i < pin.rating) Color(0xFFFBBF24) else Color(0x33FFFFFF),
                            )
                        }
                    }
                }
            }

            if (pin.note.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    pin.note,
                    fontSize = 12.sp,
                    color = Color(0x77FFFFFF),
                    lineHeight = 16.sp,
                )
            }
        }
    }
}

// ── Color dot ──────────────────────────────────────────────────────────────

@Composable
private fun MapColorDot(hex: String, selected: Boolean, onClick: () -> Unit) {
    val color = parseStackColor(hex)
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
private fun mapsFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AccentMaps.copy(alpha = 0.7f),
    unfocusedBorderColor = BgCardBorder,
    focusedContainerColor = BgCard,
    unfocusedContainerColor = BgCard,
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedLabelColor = AccentMaps,
    unfocusedLabelColor = Color(0x88FFFFFF),
)
