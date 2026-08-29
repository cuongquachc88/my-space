package com.myspace.app.ui.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.staggeredgrid.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.data.entity.NoteEntity
import com.myspace.app.ui.GlassCard
import com.myspace.app.ui.GlowFab
import com.myspace.app.ui.RadialGlow
import com.myspace.app.ui.SectionHeader
import com.myspace.app.ui.theme.*
import com.myspace.app.ui.viewmodel.NotesViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(
    onOpenNote: (String) -> Unit,
    onNewNote: () -> Unit,
    onLock: () -> Unit = {},
    onSync: () -> Unit = {},
    onSettings: () -> Unit = {},
    vm: NotesViewModel = hiltViewModel()
) {
    val notes by vm.notes.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var searchActive by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = Background,
            topBar = {
                if (searchActive) {
                    SearchBar(
                        query = searchQuery,
                        onQueryChange = { searchQuery = it; vm.search(it) },
                        onSearch = {},
                        active = false,
                        onActiveChange = {},
                        placeholder = { Text("Search notes…") },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        trailingIcon = {
                            IconButton(onClick = {
                                searchQuery = ""; vm.search(""); searchActive = false
                            }) { Icon(Icons.Default.Close, null) }
                        },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)
                    ) {}
                } else {
                    TopAppBar(
                        title = {
                            Text(
                                "Notes",
                                style = MaterialTheme.typography.headlineSmall,
                                color = OnBackground
                            )
                        },
                        actions = {
                            IconButton(onClick = { searchActive = true }) {
                                Icon(Icons.Default.Search, null, tint = OnSurfaceVariant)
                            }
                            IconButton(onClick = onSync) {
                                Icon(Icons.Default.Sync, null, tint = OnSurfaceVariant)
                            }
                            IconButton(onClick = onSettings) {
                                Icon(Icons.Default.Settings, null, tint = OnSurfaceVariant)
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                    )
                }
            },
            floatingActionButton = {
                GlowFab(onClick = onNewNote, accentColor = Primary) {
                    Icon(Icons.Rounded.Edit, contentDescription = "New note")
                }
            }
    ) { padding ->
        LazyVerticalStaggeredGrid(
                columns = StaggeredGridCells.Fixed(2),
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalItemSpacing = 12.dp
            ) {
                // Hero banner — full width card
                item(span = StaggeredGridItemSpan.FullLine) {
                    NotesHeroBanner(onLock = onLock)
                }

                if (notes.isEmpty()) {
                    item(span = StaggeredGridItemSpan.FullLine) {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.Article, null,
                                    modifier = Modifier.size(52.dp),
                                    tint = OnSurfaceVariant.copy(alpha = 0.25f)
                                )
                                Text(
                                    "No notes yet",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = OnSurfaceVariant.copy(alpha = 0.45f)
                                )
                                Text(
                                    "Tap + to create your first note",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = OnSurfaceVariant.copy(alpha = 0.3f)
                                )
                            }
                        }
                    }
                } else {
                    item(span = StaggeredGridItemSpan.FullLine) {
                        SectionHeader(title = "${notes.size} NOTES", accentColor = Primary,
                            modifier = Modifier.offset(x = (-16).dp))
                    }
                    items(notes, key = { it.id }) { note ->
                        NoteCard(note = note, onClick = { onOpenNote(note.id) })
                    }
                    item(span = StaggeredGridItemSpan.FullLine) {
                        Spacer(Modifier.height(80.dp))
                    }
                }
            }
    }
}

@Composable
private fun NotesHeroBanner(onLock: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.extraLarge)
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        PrimaryContainer.copy(alpha = 0.7f),
                        SurfaceContainerHigh.copy(alpha = 0.9f),
                    )
                )
            )
            .padding(horizontal = 20.dp, vertical = 18.dp)
    ) {
        // Subtle glow orb top-right corner
        Box(
            modifier = Modifier
                .size(140.dp)
                .align(Alignment.TopEnd)
                .offset(x = 30.dp, y = (-30).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(Primary.copy(alpha = 0.18f), Color.Transparent)
                    ),
                    shape = androidx.compose.foundation.shape.CircleShape
                )
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "My Space",
                    style = MaterialTheme.typography.titleSmall,
                    color = Primary.copy(alpha = 0.8f)
                )
                Text(
                    "Notes",
                    style = MaterialTheme.typography.displaySmall,
                    color = OnSurface
                )
                Text(
                    "Private · encrypted",
                    style = MaterialTheme.typography.labelMedium,
                    color = OnSurfaceVariant.copy(alpha = 0.6f)
                )
            }

            // Lock button — clean icon button
            FilledTonalIconButton(
                onClick = onLock,
                colors = IconButtonDefaults.filledTonalIconButtonColors(
                    containerColor = SurfaceContainerHighest,
                    contentColor = OnSurfaceVariant
                )
            ) {
                Icon(Icons.Default.Lock, contentDescription = "Lock", modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun NoteCard(note: NoteEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val accent = remember(note.id) {
        listOf(Primary, Tertiary, Secondary, OnPrimaryContainer)
            .getOrElse(note.id.hashCode().and(0xFF) % 4) { Primary }
    }

    GlassCard(modifier = modifier, accentColor = accent) {
        Column(
            modifier = Modifier
                .clickable(onClick = onClick)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Thin accent top bar
            Box(
                modifier = Modifier
                    .width(28.dp)
                    .height(3.dp)
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(accent, accent.copy(alpha = 0.3f))
                        ),
                        shape = MaterialTheme.shapes.extraSmall
                    )
            )
            if (note.title.isNotBlank()) {
                Text(
                    text = note.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = OnSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (note.content.isNotBlank()) {
                Text(
                    text = note.content,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceVariant,
                    maxLines = 6,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                text = SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(note.updatedAt)),
                style = MaterialTheme.typography.labelSmall,
                color = accent.copy(alpha = 0.6f)
            )
        }
    }
}
