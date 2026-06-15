package com.myspace.app.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.myspace.app.data.AppDatabase
import com.myspace.app.sync.DriveRepository
import com.myspace.app.ui.theme.AccentSync
import kotlinx.coroutines.launch

private const val CLIENT_ID = "564441755508-2uecg3qt74buhca2jfabqndmb5nngcms.apps.googleusercontent.com"
private const val REDIRECT   = "com.myspace.app:/oauth2callback"
private const val AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
private const val SCOPE      = "https://www.googleapis.com/auth/drive.appdata"

data class LogLine(val text: String, val type: String = "info")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncScreen(db: AppDatabase, context: Context) {
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("myspace_sync", Context.MODE_PRIVATE) }
    var token by remember { mutableStateOf(prefs.getString("access_token", null)) }
    var logs by remember { mutableStateOf<List<LogLine>>(emptyList()) }
    var loading by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val drive = remember { DriveRepository(context, db) }

    fun addLog(text: String, type: String = "info") { logs = logs + LogLine("[${java.time.LocalTime.now().toString().take(8)}] $text", type) }

    LaunchedEffect(logs) { if (logs.isNotEmpty()) listState.animateScrollToItem(logs.size - 1) }

    fun connectOAuth() {
        val url = "$AUTH_URL?client_id=$CLIENT_ID&redirect_uri=${Uri.encode(REDIRECT)}&response_type=token&scope=${Uri.encode(SCOPE)}"
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Sync") }, colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

            // Status card
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).run {
                        this
                    })
                    Column(Modifier.weight(1f)) {
                        Text("Google Drive", style = MaterialTheme.typography.titleMedium)
                        Text(if (token != null) "Connected" else "Not connected", style = MaterialTheme.typography.labelSmall, color = if (token != null) AccentSync else MaterialTheme.colorScheme.onSurface.copy(0.4f))
                    }
                    if (token != null) {
                        TextButton(onClick = { token = null; prefs.edit().remove("access_token").apply() }, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error.copy(0.7f))) {
                            Text("Disconnect")
                        }
                    }
                }
            }

            if (token == null) {
                Button(onClick = { connectOAuth(); addLog("Launching Google auth…") }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = AccentSync)) {
                    Icon(Icons.Default.Login, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Connect to Google Drive")
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            loading = "push"
                            scope.launch {
                                addLog("Exporting database…")
                                addLog("Encrypting vault…")
                                drive.push(token!!).onSuccess {
                                    addLog("Uploaded to Drive ✓", "success")
                                }.onFailure {
                                    addLog("Push failed: ${it.message}", "error")
                                }
                                loading = null
                            }
                        },
                        enabled = loading == null,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentSync),
                    ) {
                        if (loading == "push") CircularProgressIndicator(Modifier.size(14.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                        else Text("↑ Push")
                    }
                    OutlinedButton(
                        onClick = {
                            loading = "pull"
                            scope.launch {
                                addLog("Fetching from Drive…")
                                addLog("Decrypting data…")
                                drive.pull(token!!).onSuccess {
                                    addLog("Imported ${it.notes.size} notes, ${it.secrets.size} secrets, ${it.subscriptions.size} subs", "success")
                                }.onFailure {
                                    addLog("Pull failed: ${it.message}", "error")
                                }
                                loading = null
                            }
                        },
                        enabled = loading == null,
                        modifier = Modifier.weight(1f),
                    ) {
                        if (loading == "pull") CircularProgressIndicator(Modifier.size(14.dp), color = AccentSync, strokeWidth = 2.dp)
                        else Text("↓ Pull")
                    }
                }
            }

            // Log console
            if (logs.isNotEmpty()) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(0.6f))) {
                    LazyColumn(state = listState, modifier = Modifier.padding(12.dp).heightIn(max = 200.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        items(logs) { line ->
                            val color = when (line.type) {
                                "success" -> AccentSync
                                "error"   -> MaterialTheme.colorScheme.error
                                else      -> MaterialTheme.colorScheme.onSurface.copy(0.6f)
                            }
                            Text(line.text, style = MaterialTheme.typography.labelSmall, color = color)
                        }
                    }
                }
            }

            Text("Note: paste the access_token from the OAuth redirect URL after connecting.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(0.3f))
        }
    }
}
