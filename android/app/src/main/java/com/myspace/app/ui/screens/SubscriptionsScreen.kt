package com.myspace.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.SubscriptionEntity
import com.myspace.app.ui.theme.AccentSubs
import com.myspace.app.ui.theme.BgCard
import com.myspace.app.ui.theme.BgCardBorder
import com.myspace.app.util.FROM_USD
import com.myspace.app.util.monthlyEquivalentUSD
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

private val CYCLES     = listOf("monthly", "yearly", "weekly", "one-time")
private val CURRENCIES = listOf("USD", "EUR", "GBP", "VND", "JPY", "SGD")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionsScreen(db: AppDatabase) {
    val scope   = rememberCoroutineScope()
    val context = LocalContext.current

    var subs            by remember { mutableStateOf<List<SubscriptionEntity>>(emptyList()) }
    var displayCurrency by remember { mutableStateOf("USD") }
    var editSub         by remember { mutableStateOf<SubscriptionEntity?>(null) }
    var showSheet       by remember { mutableStateOf(false) }

    fun reload() { scope.launch { subs = db.subscriptionDao().getAll() } }
    LaunchedEffect(Unit) { reload() }

    val activeSubs   = subs.filter { it.active }
    val totalUSD     = activeSubs.sumOf { monthlyEquivalentUSD(it.amount, it.currency, it.cycle) }
    val totalDisplay = totalUSD * (FROM_USD[displayCurrency] ?: 1.0)

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 88.dp),
        ) {
            item {
                Spacer(Modifier.height(8.dp))

                // ── Monthly total card ──────────────────────────────────────
                Card(
                    colors = CardDefaults.cardColors(containerColor = AccentSubs.copy(alpha = 0.08f)),
                    shape  = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Recurring / month", fontSize = 12.sp, color = AccentSubs.copy(alpha = 0.7f))
                            Text(
                                "~${"%.2f".format(totalDisplay)} $displayCurrency",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = AccentSubs,
                            )
                        }
                        var currExp by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(expanded = currExp, onExpandedChange = { currExp = it }) {
                            OutlinedTextField(
                                value = displayCurrency, onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.width(100.dp).menuAnchor(MenuAnchorType.PrimaryNotEditable),
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(currExp) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = AccentSubs,
                                    unfocusedBorderColor = AccentSubs.copy(0.3f),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                ),
                                textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
                                singleLine = true,
                            )
                            ExposedDropdownMenu(expanded = currExp, onDismissRequest = { currExp = false }) {
                                CURRENCIES.forEach { c ->
                                    DropdownMenuItem(text = { Text(c) }, onClick = { displayCurrency = c; currExp = false })
                                }
                            }
                        }
                    }
                }
            }

            if (subs.isEmpty()) {
                item {
                    Box(
                        Modifier.fillMaxWidth().height(320.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.CreditCard, null, tint = AccentSubs.copy(alpha = 0.25f), modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("No subscriptions yet", fontSize = 17.sp, fontWeight = FontWeight.Medium, color = Color(0x66FFFFFF))
                            Spacer(Modifier.height(6.dp))
                            Text("Tap + to track a subscription", fontSize = 13.sp, color = Color(0x44FFFFFF))
                        }
                    }
                }
            } else {
                items(subs, key = { it.id }) { sub ->
                    SubCard(
                        sub = sub,
                        displayCurrency = displayCurrency,
                        onClick = { editSub = sub; showSheet = true },
                        onToggleActive = {
                            scope.launch {
                                db.subscriptionDao().upsert(sub.copy(active = !sub.active, updatedAt = System.currentTimeMillis()))
                                reload()
                            }
                        },
                        onDelete = { scope.launch { db.subscriptionDao().delete(sub.id); reload() } },
                    )
                }
            }
        }

        FloatingActionButton(
            onClick = { editSub = null; showSheet = true },
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
            containerColor = AccentSubs,
            shape = RoundedCornerShape(16.dp),
        ) {
            Icon(Icons.Default.Add, "Add", tint = Color.White, modifier = Modifier.size(24.dp))
        }
    }

    if (showSheet) {
        SubEditorSheet(
            existing   = editSub,
            onDismiss  = { showSheet = false },
            onSave     = { sub ->
                scope.launch { db.subscriptionDao().upsert(sub); showSheet = false; reload() }
            },
            onDelete   = { sub ->
                scope.launch { db.subscriptionDao().delete(sub.id); showSheet = false; reload() }
            },
        )
    }
}

// ── Subscription card ────────────────────────────────────────────────────────

@Composable
private fun SubCard(
    sub: SubscriptionEntity,
    displayCurrency: String,
    onClick: () -> Unit,
    onToggleActive: () -> Unit,
    onDelete: () -> Unit,
) {
    val context = LocalContext.current
    val monthly = if (sub.active) monthlyEquivalentUSD(sub.amount, sub.currency, sub.cycle) * (FROM_USD[displayCurrency] ?: 1.0) else 0.0
    val dimAlpha = if (sub.active) 1f else 0.4f

    Card(
        onClick = onClick,
        colors  = CardDefaults.cardColors(containerColor = if (sub.active) BgCard else BgCard.copy(alpha = 0.5f)),
        shape   = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (sub.logoUri.isNotBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(context).data(Uri.parse(sub.logoUri)).crossfade(true).build(),
                    contentDescription = sub.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)),
                )
            } else {
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(AccentSubs.copy(alpha = 0.15f * dimAlpha)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        sub.name.take(1).uppercase(),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentSubs.copy(alpha = dimAlpha),
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(sub.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White.copy(alpha = dimAlpha))
                Text(
                    "${sub.amount} ${sub.currency} / ${sub.cycle}",
                    fontSize = 12.sp,
                    color = Color(0x88FFFFFF).copy(alpha = dimAlpha),
                )
            }

            if (sub.active) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "~${"%.2f".format(monthly)}",
                        fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = AccentSubs,
                    )
                    Text("$displayCurrency/mo", fontSize = 11.sp, color = AccentSubs.copy(alpha = 0.5f))
                }
            } else {
                Text("Inactive", fontSize = 11.sp, color = Color(0x44FFFFFF))
            }

            // Active toggle
            IconButton(onClick = onToggleActive, modifier = Modifier.size(32.dp)) {
                Icon(
                    if (sub.active) Icons.Default.PauseCircle else Icons.Default.PlayCircle,
                    "Toggle active",
                    tint = if (sub.active) AccentSubs.copy(0.5f) else Color(0x55FFFFFF),
                    modifier = Modifier.size(18.dp),
                )
            }

            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Delete, "Delete", tint = Color(0x44FFFFFF), modifier = Modifier.size(16.dp))
            }
        }
    }
}

// ── Add / Edit bottom sheet ──────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubEditorSheet(
    existing: SubscriptionEntity?,
    onDismiss: () -> Unit,
    onSave: (SubscriptionEntity) -> Unit,
    onDelete: (SubscriptionEntity) -> Unit,
) {
    val context = LocalContext.current
    var name     by remember { mutableStateOf(existing?.name     ?: "") }
    var amount   by remember { mutableStateOf(existing?.amount?.toString() ?: "") }
    var currency by remember { mutableStateOf(existing?.currency ?: "USD") }
    var cycle    by remember { mutableStateOf(existing?.cycle    ?: "monthly") }
    var logoUri  by remember { mutableStateOf(existing?.logoUri  ?: "") }
    var active   by remember { mutableStateOf(existing?.active   ?: true) }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }
            logoUri = uri.toString()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = rememberModalBottomSheetState(),
        containerColor   = Color(0xFF0D1117),
        dragHandle       = null,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Cancel", fontSize = 16.sp, color = Color(0x88FFFFFF))
                }
                Text(
                    if (existing == null) "New Subscription" else "Edit Subscription",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                )
                TextButton(onClick = {
                    val amt = amount.toDoubleOrNull()
                    if (name.isNotBlank() && amt != null) {
                        val now = System.currentTimeMillis()
                        onSave(SubscriptionEntity(
                            id        = existing?.id ?: UUID.randomUUID().toString(),
                            name      = name,
                            amount    = amt,
                            currency  = currency,
                            cycle     = cycle,
                            startDate = existing?.startDate ?: LocalDate.now().toString(),
                            tags      = existing?.tags ?: "[]",
                            notes     = existing?.notes ?: "",
                            logoUri   = logoUri,
                            active    = active,
                            createdAt = existing?.createdAt ?: now,
                            updatedAt = now,
                        ))
                    }
                }) {
                    Text("Save", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = AccentSubs)
                }
            }

            HorizontalDivider(color = Color(0x20FFFFFF))
            Spacer(Modifier.height(20.dp))

            // Logo picker
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(BgCard)
                        .border(1.dp, if (logoUri.isNotBlank()) AccentSubs.copy(0.5f) else BgCardBorder, RoundedCornerShape(14.dp))
                        .clickable { imagePicker.launch("image/*") },
                    contentAlignment = Alignment.Center,
                ) {
                    if (logoUri.isNotBlank()) {
                        AsyncImage(
                            model = ImageRequest.Builder(context).data(Uri.parse(logoUri)).crossfade(true).build(),
                            contentDescription = "Logo",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)),
                        )
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.AddPhotoAlternate, null, tint = Color(0x66FFFFFF), modifier = Modifier.size(24.dp))
                            Text("Logo", fontSize = 10.sp, color = Color(0x55FFFFFF))
                        }
                    }
                }
                Column {
                    Text("App Logo", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                    Text("Tap to pick from gallery", fontSize = 12.sp, color = Color(0x66FFFFFF))
                    if (logoUri.isNotBlank()) {
                        TextButton(
                            onClick = { logoUri = "" },
                            contentPadding = PaddingValues(0.dp),
                        ) {
                            Text("Remove", fontSize = 12.sp, color = Color(0xFFFC8181))
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Service name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = subsFieldColors(),
                textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
            )
            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = amount, onValueChange = { amount = it },
                    label = { Text("Amount") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = subsFieldColors(),
                    textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
                )
                var currExp by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = currExp, onExpandedChange = { currExp = it },
                    modifier = Modifier.width(110.dp),
                ) {
                    OutlinedTextField(
                        value = currency, onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(currExp) },
                        shape = RoundedCornerShape(12.dp),
                        colors = subsFieldColors(),
                        textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
                        singleLine = true,
                    )
                    ExposedDropdownMenu(expanded = currExp, onDismissRequest = { currExp = false }) {
                        CURRENCIES.forEach { c ->
                            DropdownMenuItem(text = { Text(c) }, onClick = { currency = c; currExp = false })
                        }
                    }
                }
            }
            Spacer(Modifier.height(14.dp))

            Text("Billing cycle", fontSize = 13.sp, color = Color(0x88FFFFFF))
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CYCLES.forEach { c ->
                    FilterChip(
                        selected = cycle == c,
                        onClick  = { cycle = c },
                        label    = { Text(c, fontSize = 12.sp) },
                        colors   = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AccentSubs.copy(alpha = 0.2f),
                            selectedLabelColor     = AccentSubs,
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = cycle == c,
                            selectedBorderColor = AccentSubs.copy(0.5f),
                            borderColor = BgCardBorder,
                        ),
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Color(0x15FFFFFF))
            Row(
                Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Active", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color.White)
                    Text(
                        if (active) "Counted in monthly total & reports" else "Paused — excluded from totals",
                        fontSize = 11.sp, color = Color(0x66FFFFFF),
                    )
                }
                Switch(
                    checked = active,
                    onCheckedChange = { active = it },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor  = Color.White,
                        checkedTrackColor  = AccentSubs,
                        uncheckedTrackColor = Color(0x33FFFFFF),
                    ),
                )
            }

            if (existing != null) {
                HorizontalDivider(color = Color(0x15FFFFFF))
                TextButton(
                    onClick = { onDelete(existing) },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                ) {
                    Text("Delete Subscription", fontSize = 15.sp, color = Color(0xFFFC8181))
                }
            }
        }
    }
}

@Composable
private fun subsFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor    = AccentSubs.copy(alpha = 0.7f),
    unfocusedBorderColor  = BgCardBorder,
    focusedContainerColor = BgCard,
    unfocusedContainerColor = BgCard,
    focusedTextColor      = Color.White,
    unfocusedTextColor    = Color.White,
    focusedLabelColor     = AccentSubs,
    unfocusedLabelColor   = Color(0x88FFFFFF),
)
