package com.myspace.app.ui.screen

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.SubscriptionEntity
import com.myspace.app.ui.viewmodel.SubscriptionsViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionsScreen(
    onReports: () -> Unit,
    vm: SubscriptionsViewModel = hiltViewModel()
) {
    val subs by vm.subscriptions.collectAsState()
    var showAddSheet by remember { mutableStateOf(false) }

    val totalMonthly = subs.filter { it.active }.sumOf {
        when (it.cycle) {
            "yearly"    -> it.amount / 12.0
            "weekly"    -> it.amount * 4.0
            "quarterly" -> it.amount / 3.0
            else        -> it.amount
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Subscriptions", style = MaterialTheme.typography.headlineSmall) },
                actions = {
                    IconButton(onClick = onReports) {
                        Icon(Icons.Default.BarChart, contentDescription = "Reports")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddSheet = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) { Icon(Icons.Default.Add, contentDescription = "Add subscription") }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Summary card
            ElevatedCard(
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Monthly total", style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Text(
                        "$${"%.2f".format(totalMonthly)}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text("${subs.count { it.active }} active · ${subs.size} total",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f))
                }
            }

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(subs, key = { it.id }) { sub ->
                    SubCard(
                        sub = sub,
                        onToggle = { vm.toggleActive(sub) },
                        onDelete = { vm.delete(sub.id) }
                    )
                }
            }
        }
    }

    if (showAddSheet) {
        AddSubSheet(
            onDismiss = { showAddSheet = false },
            onSave = { name, amount, currency, cycle ->
                vm.add(name, amount, currency, cycle)
                showAddSheet = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubCard(sub: SubscriptionEntity, onToggle: () -> Unit, onDelete: () -> Unit) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) { onDelete(); true }
            else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(
                Modifier.fillMaxSize().padding(end = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            }
        }
    ) {
        ElevatedCard(
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Status dot
                Surface(
                    shape = MaterialTheme.shapes.extraSmall,
                    color = if (sub.active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(10.dp)
                ) {}

                Column(modifier = Modifier.weight(1f)) {
                    Text(sub.name, style = MaterialTheme.typography.titleSmall,
                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        "${sub.currency} ${"%.2f".format(sub.amount)} / ${sub.cycle}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Switch(checked = sub.active, onCheckedChange = { onToggle() })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddSubSheet(onDismiss: () -> Unit, onSave: (String, Double, String, String) -> Unit) {
    var name     by remember { mutableStateOf("") }
    var amount   by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("USD") }
    var cycle    by remember { mutableStateOf("monthly") }
    val cycles = listOf("monthly", "yearly", "weekly", "quarterly")

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp).navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Add Subscription", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(value = name, onValueChange = { name = it },
                label = { Text("Name") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = amount, onValueChange = { amount = it },
                    label = { Text("Amount") }, singleLine = true,
                    modifier = Modifier.weight(1f), shape = MaterialTheme.shapes.medium)
                OutlinedTextField(value = currency, onValueChange = { currency = it },
                    label = { Text("Currency") }, singleLine = true,
                    modifier = Modifier.width(100.dp), shape = MaterialTheme.shapes.medium)
            }
            Text("Billing cycle:", style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                cycles.forEach { c ->
                    FilterChip(
                        selected = cycle == c,
                        onClick = { cycle = c },
                        label = { Text(c.replaceFirstChar { it.uppercase(Locale.getDefault()) },
                            style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = {
                        val amt = amount.toDoubleOrNull() ?: 0.0
                        if (name.isNotBlank()) onSave(name, amt, currency, cycle)
                    },
                    modifier = Modifier.weight(1f)
                ) { Text("Save") }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
