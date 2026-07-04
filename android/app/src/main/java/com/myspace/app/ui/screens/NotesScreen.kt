package com.myspace.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.NoteEntity
import androidx.compose.foundation.BorderStroke
import com.myspace.app.ui.theme.AccentLime
import com.myspace.app.ui.theme.AccentNotes
import com.myspace.app.ui.theme.BgDeep
import com.myspace.app.ui.theme.BgElevated
import com.myspace.app.ui.theme.BgSurface
import com.myspace.app.ui.theme.BgCardBorder
import com.myspace.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.util.UUID

private fun urisToJson(uris: List<String>): String =
    JSONArray().apply { uris.forEach { put(it) } }.toString()

private fun jsonToUris(json: String): List<String> = try {
    val arr = JSONArray(json)
    (0 until arr.length()).map { arr.getString(it) }
} catch (_: Exception) { emptyList() }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(db: AppDatabase) {
    val scope   = rememberCoroutineScope()
    val context = LocalContext.current
    var notes     by remember { mutableStateOf<List<NoteEntity>>(emptyList()) }
    var query     by remember { mutableStateOf("") }
    var editNote  by remember { mutableStateOf<NoteEntity?>(null) }
    var showEditor by remember { mutableStateOf(false) }
    var editorTitle   by remember { mutableStateOf("") }
    var editorContent by remember { mutableStateOf("") }
    var editorImages  by remember { mutableStateOf<List<String>>(emptyList()) }

    fun reload() {
        scope.launch {
            notes = if (query.isBlank()) db.noteDao().getAll() else db.noteDao().search(query)
        }
    }
    LaunchedEffect(Unit) { reload() }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; reload() },
                placeholder = { Text("Search notes…", fontSize = 15.sp, color = Color(0x55FFFFFF)) },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 16.dp),
                singleLine = true,
                shape = RoundedCornerShape(50.dp),
                leadingIcon = {
                    Icon(Icons.Default.Search, null, tint = Color(0x55FFFFFF), modifier = Modifier.size(18.dp))
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AccentNotes.copy(alpha = 0.5f),
                    unfocusedBorderColor = BgCardBorder,
                    focusedContainerColor = BgElevated,
                    unfocusedContainerColor = BgElevated,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
                textStyle = LocalTextStyle.current.copy(fontSize = 15.sp),
            )

            if (notes.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Note, null, tint = AccentNotes.copy(alpha = 0.3f), modifier = Modifier.size(56.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No notes yet", fontSize = 17.sp, fontWeight = FontWeight.Medium, color = TextSecondary)
                        Spacer(Modifier.height(6.dp))
                        Text("Tap + to create your first note", fontSize = 13.sp, color = TextSecondary.copy(alpha = 0.6f))
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(notes, key = { it.id }) { note ->
                        val images = jsonToUris(note.imageUris)
                        Card(
                            onClick = {
                                editNote = note
                                editorTitle   = note.title
                                editorContent = note.content
                                editorImages  = jsonToUris(note.imageUris)
                                showEditor = true
                            },
                            colors = CardDefaults.cardColors(containerColor = BgSurface),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, BgCardBorder),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(AccentNotes.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Default.Note, null, tint = AccentNotes, modifier = Modifier.size(20.dp))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(note.title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                        if (note.content.isNotBlank()) {
                                            Text(note.content.take(100), fontSize = 13.sp, color = Color(0x88FFFFFF), lineHeight = 18.sp)
                                        }
                                    }
                                    IconButton(onClick = {
                                        scope.launch { db.noteDao().delete(note.id); reload() }
                                    }, modifier = Modifier.size(32.dp)) {
                                        Icon(Icons.Default.Delete, "Delete", tint = Color(0x55FFFFFF), modifier = Modifier.size(17.dp))
                                    }
                                }
                                // Image strip
                                if (images.isNotEmpty()) {
                                    Spacer(Modifier.height(10.dp))
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        items(images) { uri ->
                                            AsyncImage(
                                                model = ImageRequest.Builder(context).data(Uri.parse(uri)).crossfade(true).build(),
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier
                                                    .size(72.dp)
                                                    .clip(RoundedCornerShape(10.dp)),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = {
                editNote = null
                editorTitle = ""; editorContent = ""; editorImages = emptyList()
                showEditor = true
            },
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
            containerColor = AccentLime,
            shape = RoundedCornerShape(20.dp),
        ) {
            Icon(Icons.Default.Add, "New note", tint = BgDeep, modifier = Modifier.size(24.dp))
        }
    }

    if (showEditor) {
        NoteEditorSheet(
            title = editorTitle,
            content = editorContent,
            images = editorImages,
            isNew = editNote == null,
            onTitleChange   = { editorTitle = it },
            onContentChange = { editorContent = it },
            onImagesChange  = { editorImages = it },
            onSave = {
                if (editorTitle.isNotBlank()) {
                    val now = System.currentTimeMillis()
                    scope.launch {
                        val id = editNote?.id ?: UUID.randomUUID().toString()
                        db.noteDao().upsert(
                            NoteEntity(id, editorTitle, editorContent, "[]", urisToJson(editorImages), now, now)
                        )
                        showEditor = false; reload()
                    }
                }
            },
            onDismiss = { showEditor = false },
            onDelete = {
                editNote?.let { n ->
                    scope.launch { db.noteDao().delete(n.id); showEditor = false; reload() }
                }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteEditorSheet(
    title: String,
    content: String,
    images: List<String>,
    isNew: Boolean,
    onTitleChange: (String) -> Unit,
    onContentChange: (String) -> Unit,
    onImagesChange: (List<String>) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
    onDelete: () -> Unit,
) {
    val context = LocalContext.current

    val imagePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        uris.forEach { uri ->
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }
        }
        onImagesChange(images + uris.map { it.toString() })
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(),
        containerColor = Color(0xFF0A0E17),
        dragHandle = null,
        modifier = Modifier.fillMaxHeight(0.93f),
    ) {
        Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
            // Header
            Row(
                Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Cancel", fontSize = 16.sp, color = Color(0x88FFFFFF))
                }
                Text(
                    if (isNew) "New Note" else "Edit Note",
                    fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White,
                )
                TextButton(onClick = onSave) {
                    Text("Save", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = AccentNotes)
                }
            }

            HorizontalDivider(color = Color(0x20FFFFFF))
            Spacer(Modifier.height(12.dp))

            // Title
            TextField(
                value = title,
                onValueChange = onTitleChange,
                placeholder = { Text("Title", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0x44FFFFFF)) },
                textStyle = LocalTextStyle.current.copy(fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    cursorColor = AccentNotes,
                ),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Image toolbar row
            Row(
                Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedButton(
                    onClick = { imagePicker.launch("image/*") },
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentNotes),
                    border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp),
                ) {
                    Icon(Icons.Default.AddPhotoAlternate, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Add Images", fontSize = 13.sp)
                }
                if (images.isNotEmpty()) {
                    Text("${images.size} image${if (images.size > 1) "s" else ""}", fontSize = 12.sp, color = Color(0x66FFFFFF))
                }
            }

            // Image preview strip
            if (images.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(bottom = 10.dp),
                ) {
                    items(images) { uri ->
                        Box {
                            AsyncImage(
                                model = ImageRequest.Builder(context).data(Uri.parse(uri)).crossfade(true).build(),
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.size(80.dp).clip(RoundedCornerShape(10.dp)),
                            )
                            // Remove button
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(4.dp)
                                    .size(20.dp)
                                    .clip(RoundedCornerShape(50))
                                    .background(Color(0xCC000000))
                                    .clickable { onImagesChange(images - uri) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                }
            }

            HorizontalDivider(color = Color(0x15FFFFFF))

            // Content
            TextField(
                value = content,
                onValueChange = onContentChange,
                placeholder = { Text("Write your note… (Markdown supported)", fontSize = 15.sp, color = Color(0x44FFFFFF)) },
                textStyle = LocalTextStyle.current.copy(fontSize = 15.sp, color = Color(0xDDFFFFFF), lineHeight = 24.sp),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    cursorColor = AccentNotes,
                ),
                modifier = Modifier.fillMaxWidth().weight(1f),
            )

            if (!isNew) {
                HorizontalDivider(color = Color(0x20FFFFFF))
                TextButton(
                    onClick = onDelete,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                ) {
                    Text("Delete Note", fontSize = 15.sp, color = Color(0xFFFC8181))
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
