package com.myspace.app.ui.screen

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.TodoListEntity
import com.myspace.app.ui.theme.DarkBackground
import com.myspace.app.ui.viewmodel.TodosViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodosScreen(onOpenList: (String) -> Unit, vm: TodosViewModel = hiltViewModel()) {
    val lists by vm.lists.collectAsState()
    var showAdd by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("To-Do Lists") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBackground),
                actions = { IconButton(onClick = { showAdd = !showAdd }) { Icon(Icons.Default.Add, "Add list") } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (showAdd) {
                Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("List name") }, singleLine = true, modifier = Modifier.weight(1f))
                    Button(onClick = { vm.addList(newName); newName = ""; showAdd = false }, enabled = newName.isNotBlank()) { Text("Add") }
                }
            }
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(lists, key = { it.id }) { list ->
                    TodoListCard(list = list, onClick = { onOpenList(list.id) }, onDelete = { vm.deleteList(list.id) })
                }
            }
        }
    }
}

@Composable
private fun TodoListCard(list: TodoListEntity, onClick: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(list.icon.ifBlank { "📋" }, modifier = Modifier.padding(end = 8.dp))
            Text(list.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error) }
        }
    }
}
