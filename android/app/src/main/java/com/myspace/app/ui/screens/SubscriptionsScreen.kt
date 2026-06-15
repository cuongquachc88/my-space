package com.myspace.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.SubscriptionEntity
import com.myspace.app.ui.theme.AccentSubs
import kotlinx.coroutines.launch
import java.util.UUID

private val CYCLES = listOf("monthly", "yearly", "weekly", "one-time")
private val CURRENCIES = listOf("USD", "EUR", "GBP", "VND", "JPY", "SGD")

private val TO_USD = mapOf("USD" to 1.0, "EUR" to 1.08, "GBP" to 1.27, "VND" to 0.000039, "JPY" to 0.0067, "SGD" to 0.74)
private val FROM_USD = TO_USD.mapValues { 1.0 / it.value }

private fun monthlyUSD(amount: Double, currency: String, cycle: String): Double {
    val usd = amount * (TO_USD[currency] ?: 1.0)
    return when (cycle) {
        "monthly"  -> usd
        "yearly"   -> usd / 12
        "weekly"   -> usd * 4.33
        else       -> 0.0
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionsScreen(db: AppDatabase) {
    val scope = rememberCoroutineScope()
    var subs by remember { mutableStateOf<List<SubscriptionEntity>>(emptyList()) }
    var displayCurrency by remember { mutableStateOf("USD") }
    var showAdd by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newAmount by remember { mutableStateOf("") }
    var newCurrency by remember { mutableStateOf("USD") }
    var newCycle by remember { mutableStateOf("monthly") }

    fun reload() { scope.launch { subs = db.subscriptionDao().getAll() } }
    LaunchedEffect(Unit) { reload() }

    val totalUSD = subs.sumOf { monthlyUSD(it.amount, it.currency, it.cycle) }
    val totalDisplay = totalUSD * (FROM_USD[displayCurrency] ?: 1.0)

    Scaffold(
        topBar = { TopAppBar(title = { Text("Subscriptions") }, colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }, containerColor = AccentSubs) {
                Icon(Icons.Default.Add, "Add subscription")
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.padding(padding).padding(horizontal = 16.dp)) {
            // Monthly total header
            Card(
                colors = CardDefaults.cardColors(containerColor = AccentSubs.copy(alpha = 0.08f)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            ) {
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Recurring / month", color = AccentSubs.copy(alpha = 0.7f), style = MaterialTheme.typography.labelSmall)
                        Text("approx. rates", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), style = MaterialTheme.typography.labelSmall)
                    }
                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                        OutlinedTextField(
                            value = displayCurrency, onValueChange = {},
                            readOnly = true, modifier = Modifier.width(90.dp).menuAnchor(),
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = AccentSubs, unfocusedBorderColor = AccentSubs.copy(0.3f)),
                            textStyle = MaterialTheme.typography.labelSmall,
                        )
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            CURRENCIES.forEach { c ->
                                DropdownMenuItem(text = { Text(c) }, onClick = { displayCurrency = c; expanded = false })
                            }
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    Text("~${"%.2f".format(totalDisplay)} $displayCurrency", color = AccentSubs, style = MaterialTheme.typography.titleMedium)
                }
            }

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(subs, key = { it.id }) { sub ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(sub.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                Text("${sub.amount} ${sub.currency} / ${sub.cycle}", style = MaterialTheme.typography.labelSmall, color = AccentSubs)
                                if (sub.cycle != "one-time")
                                    Text("Next: ${sub.startDate}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(0.35f))
                            }
                            IconButton(onClick = { scope.launch { db.subscriptionDao().delete(sub.id); reload() } }) {
                                Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error.copy(0.6f))
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAdd) {
        AlertDialog(
            onDismissRequest = { showAdd = false },
            title = { Text("New Subscription") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = newAmount, onValueChange = { newAmount = it }, label = { Text("Amount") }, singleLine = true, modifier = Modifier.weight(1f))
                        var currExp by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(expanded = currExp, onExpandedChange = { currExp = it }, modifier = Modifier.width(100.dp)) {
                            OutlinedTextField(value = newCurrency, onValueChange = {}, readOnly = true, modifier = Modifier.menuAnchor(), trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(currExp) })
                            ExposedDropdownMenu(expanded = currExp, onDismissRequest = { currExp = false }) {
                                CURRENCIES.forEach { c -> DropdownMenuItem(text = { Text(c) }, onClick = { newCurrency = c; currExp = false }) }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        CYCLES.forEach { c ->
                            FilterChip(selected = newCycle == c, onClick = { newCycle = c }, label = { Text(if (c == "one-time") "once" else c.take(2), style = MaterialTheme.typography.labelSmall) })
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val amt = newAmount.toDoubleOrNull()
                    if (newName.isNotBlank() && amt != null) {
                        scope.launch {
                            val now = System.currentTimeMillis()
                            db.subscriptionDao().upsert(SubscriptionEntity(UUID.randomUUID().toString(), newName, amt, newCurrency, newCycle, java.time.LocalDate.now().toString(), "[]", "", now, now))
                            newName = ""; newAmount = ""; showAdd = false; reload()
                        }
                    }
                }) { Text("Save", color = AccentSubs) }
            },
            dismissButton = { TextButton(onClick = { showAdd = false }) { Text("Cancel") } },
        )
    }
}
