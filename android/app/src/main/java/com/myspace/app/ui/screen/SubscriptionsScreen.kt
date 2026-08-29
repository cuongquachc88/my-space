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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.SubscriptionEntity
import com.myspace.app.ui.theme.DarkBackground
import com.myspace.app.ui.viewmodel.SubscriptionsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionsScreen(
    onReports: () -> Unit,
    vm: SubscriptionsViewModel = hiltViewModel()
) {
    val subs by vm.subscriptions.collectAsState()
    var showAdd by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Subscriptions") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground),
                actions = {
                    IconButton(onClick = onReports) { Icon(Icons.Default.BarChart, "Reports") }
                    IconButton(onClick = { showAdd = !showAdd }) { Icon(Icons.Default.Add, "Add") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (showAdd) AddSubscriptionCard(vm = vm, onDone = { showAdd = false })

            // Monthly total
            val total = subs.filter { it.active }.sumOf { it.amount }
            if (subs.isNotEmpty()) {
                Text(
                    "~\$${"%.2f".format(total)}/mo",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }

            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(subs, key = { it.id }) { sub ->
                    SubscriptionCard(sub = sub, onToggle = { vm.toggleActive(sub) }, onDelete = { vm.delete(sub.id) })
                }
            }
        }
    }
}

@Composable
private fun SubscriptionCard(sub: SubscriptionEntity, onToggle: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(sub.name, style = MaterialTheme.typography.titleSmall)
                Text("${sub.currency} ${"%.2f".format(sub.amount)} / ${sub.cycle}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            Switch(checked = sub.active, onCheckedChange = { onToggle() })
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun AddSubscriptionCard(vm: SubscriptionsViewModel, onDone: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("USD") }
    var cycle by remember { mutableStateOf("monthly") }

    ElevatedCard(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Add Subscription", style = MaterialTheme.typography.labelMedium)
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = amount, onValueChange = { amount = it }, label = { Text("Amount") }, singleLine = true, modifier = Modifier.weight(2f))
                OutlinedTextField(value = currency, onValueChange = { currency = it }, label = { Text("Currency") }, singleLine = true, modifier = Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDone, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { vm.add(name, amount.toDoubleOrNull() ?: 0.0, currency, cycle); onDone() },
                    enabled = name.isNotBlank(),
                    modifier = Modifier.weight(1f)
                ) { Text("Save") }
            }
        }
    }
}
