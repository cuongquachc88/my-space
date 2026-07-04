package com.myspace.app.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.data.AppDatabase
import com.myspace.app.sync.DriveRepository
import com.myspace.app.ui.theme.AccentSync
import com.myspace.app.ui.theme.BgSurface
import com.myspace.app.ui.theme.BgCardBorder
import kotlinx.coroutines.launch

private const val CLIENT_ID = "564441755508-2uecg3qt74buhca2jfabqndmb5nngcms.apps.googleusercontent.com"
private const val REDIRECT   = "com.myspace.app:/oauth2callback"
private const val AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
private const val SCOPE      = "https://www.googleapis.com/auth/drive.appdata"

data class LogLine(val text: String, val type: String = "info")

@Composable
fun SyncScreen(db: AppDatabase, context: Context) {
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("myspace_sync", Context.MODE_PRIVATE) }
    var token   by remember { mutableStateOf(prefs.getString("access_token", null)) }
    var logs    by remember { mutableStateOf<List<LogLine>>(emptyList()) }
    var loading by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val drive = remember { DriveRepository(context, db) }

    fun addLog(text: String, type: String = "info") {
        logs = logs + LogLine("[${java.time.LocalTime.now().toString().take(8)}] $text", type)
    }

    LaunchedEffect(logs) { if (logs.isNotEmpty()) listState.animateScrollToItem(logs.size - 1) }

    fun connectOAuth() {
        val url = "$AUTH_URL?client_id=$CLIENT_ID&redirect_uri=${Uri.encode(REDIRECT)}&response_type=token&scope=${Uri.encode(SCOPE)}"
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Status card
        Card(
            colors = CardDefaults.cardColors(containerColor = BgSurface),
            shape  = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(10.dp)
                        .let {
                            if (token != null) it else it
                        },
                ) {
                    Surface(
                        modifier = Modifier.size(10.dp),
                        shape = RoundedCornerShape(50),
                        color = if (token != null) Color(0xFF22C55E) else Color(0xFF4B5563),
                    ) {}
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Google Drive", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    Text(
                        if (token != null) "Connected" else "Not connected",
                        fontSize = 12.sp,
                        color = if (token != null) AccentSync else Color(0x66FFFFFF),
                    )
                }
                if (token != null) {
                    TextButton(
                        onClick = { token = null; prefs.edit().remove("access_token").apply() },
                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFFC8181)),
                    ) {
                        Text("Disconnect", fontSize = 13.sp)
                    }
                }
            }
        }

        if (token == null) {
            Button(
                onClick = { connectOAuth(); addLog("Launching Google auth…") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentSync),
            ) {
                Icon(Icons.Default.Login, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Connect to Google Drive", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
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
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentSync),
                ) {
                    if (loading == "push") CircularProgressIndicator(Modifier.size(15.dp), color = Color.White, strokeWidth = 2.dp)
                    else { Text("↑ Push", fontSize = 15.sp, fontWeight = FontWeight.SemiBold) }
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
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp),
                ) {
                    if (loading == "pull") CircularProgressIndicator(Modifier.size(15.dp), color = AccentSync, strokeWidth = 2.dp)
                    else { Text("↓ Pull", fontSize = 15.sp, color = AccentSync) }
                }
            }
        }

        // Log console
        if (logs.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = BgSurface),
                shape  = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf(Color(0xFFFF5F57), Color(0xFFFEBC2E), Color(0xFF28C840)).forEach { c ->
                                Surface(modifier = Modifier.size(7.dp), shape = RoundedCornerShape(50), color = c) {}
                            }
                        }
                        Spacer(Modifier.width(8.dp))
                        Text("sync log", fontSize = 10.sp, color = Color(0x44FFFFFF), fontFamily = FontFamily.Monospace)
                    }
                    Spacer(Modifier.height(8.dp))
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.heightIn(max = 180.dp),
                        verticalArrangement = Arrangement.spacedBy(3.dp),
                    ) {
                        items(logs) { line ->
                            val color = when (line.type) {
                                "success" -> AccentSync
                                "error"   -> Color(0xFFFC8181)
                                else      -> Color(0x88FFFFFF)
                            }
                            Text(line.text, fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = color)
                        }
                    }
                }
            }
        }
    }
}
