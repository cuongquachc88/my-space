package com.myspace.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.crypto.CryptoManager
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.SecretEntity
import com.myspace.app.data.SecretMeta
import com.myspace.app.ui.theme.AccentLime
import com.myspace.app.ui.theme.AccentVault
import com.myspace.app.ui.theme.BgDeep
import com.myspace.app.ui.theme.BgElevated
import com.myspace.app.ui.theme.BgSurface
import com.myspace.app.ui.theme.BgCardBorder
import com.myspace.app.ui.theme.TextSecondary
import com.myspace.app.util.TagUtils
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultScreen(db: AppDatabase) {
    val scope = rememberCoroutineScope()
    var secrets by remember { mutableStateOf<List<SecretMeta>>(emptyList()) }
    var revealed by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var showSheet by remember { mutableStateOf(false) }
    var editingId by remember { mutableStateOf<String?>(null) }

    // Form state — reused for Add and Edit. editValueDecrypted holds the current
    // plaintext when editing, so the user can see (and replace) the value.
    var formLabel by remember { mutableStateOf("") }
    var formValue by remember { mutableStateOf("") }
    var formUrl by remember { mutableStateOf("") }
    var formDesc by remember { mutableStateOf("") }
    var formVisible by remember { mutableStateOf(false) }

    var query by remember { mutableStateOf("") }
    var activeTag by remember { mutableStateOf<String?>(null) }
    var allTags by remember { mutableStateOf<List<String>>(emptyList()) }

    fun reload() {
        scope.launch {
            val list = when {
                activeTag != null -> db.secretDao().getMetaByTag("\"$activeTag\"")
                query.isNotBlank() -> db.secretDao().searchMeta(query)
                else -> db.secretDao().getMeta()
            }
            secrets = list
            allTags = list
                .flatMap { TagUtils.parseTags(it.tags) }
                .distinct()
                .sorted()
        }
    }
    LaunchedEffect(Unit) { reload() }

    fun openAdd() {
        editingId = null
        formLabel = ""
        formValue = ""
        formUrl = ""
        formDesc = ""
        formVisible = false
        showSheet = true
    }

    fun openEdit(meta: SecretMeta) {
        editingId = meta.id
        formLabel = meta.label
        formValue = "" // empty = keep current; user types to replace
        formUrl = meta.url
        formDesc = meta.description
        formVisible = false
        showSheet = true
    }

    fun saveSecret() {
        val label = formLabel.trim()
        val value = formValue
        if (label.isEmpty()) return
        val url = formUrl.trim()
        val desc = formDesc.trim()
        scope.launch {
            val now = System.currentTimeMillis()
            val existingId = editingId
            if (existingId != null) {
                // Edit: keep id, optionally re-encrypt if value changed
                if (value.isNotEmpty()) {
                    val (ct, iv) = CryptoManager.encrypt(value)
                    val row = db.secretDao().getById(existingId)
                    if (row != null) {
                        db.secretDao().upsert(SecretEntity(existingId, label, ct, iv, row.tags, url, desc, row.createdAt, now))
                    }
                } else {
                    val row = db.secretDao().getById(existingId)
                    if (row != null) {
                        db.secretDao().upsert(SecretEntity(existingId, label, row.ciphertext, row.iv, row.tags, url, desc, row.createdAt, now))
                    }
                }
                revealed = revealed - existingId
            } else {
                if (value.isEmpty()) return@launch
                val (ct, iv) = CryptoManager.encrypt(value)
                db.secretDao().upsert(SecretEntity(UUID.randomUUID().toString(), label, ct, iv, "[]", url, desc, now, now))
            }
            showSheet = false
            reload()
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(8.dp))

            // Search bar
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; activeTag = null; reload() },
                placeholder = { Text("Search secrets…", fontSize = 13.sp, color = Color(0x55FFFFFF)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(50.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AccentVault.copy(alpha = 0.5f),
                    unfocusedBorderColor = BgCardBorder,
                    focusedContainerColor = BgElevated,
                    unfocusedContainerColor = BgElevated,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
                leadingIcon = {
                    Icon(Icons.Default.Search, null, tint = Color(0x55FFFFFF), modifier = Modifier.size(18.dp))
                },
                textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
            )

            // Tag filter chips
            if (allTags.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    items(allTags) { tag ->
                        FilterChip(
                            selected = activeTag == tag,
                            onClick = {
                                activeTag = if (activeTag == tag) null else tag
                                query = ""
                                reload()
                            },
                            label = { Text("#$tag", fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AccentVault.copy(alpha = 0.2f),
                                selectedLabelColor = AccentVault,
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = activeTag == tag,
                                selectedBorderColor = AccentVault.copy(0.5f),
                                borderColor = BgCardBorder,
                            ),
                        )
                    }
                }
            }

            if (secrets.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Lock, null, tint = AccentVault.copy(alpha = 0.3f), modifier = Modifier.size(56.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("Vault is empty", fontSize = 17.sp, fontWeight = FontWeight.Medium, color = TextSecondary)
                        Spacer(Modifier.height(6.dp))
                        Text("Tap + to add a secret", fontSize = 13.sp, color = TextSecondary.copy(alpha = 0.6f))
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(secrets, key = { it.id }) { meta ->
                        val value = revealed[meta.id]
                        Card(
                            colors = CardDefaults.cardColors(containerColor = BgSurface),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, BgCardBorder),
                        ) {
                            Column(
                                Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(AccentVault.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Default.Lock, null, tint = AccentVault, modifier = Modifier.size(20.dp))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(meta.label, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                                        Text(
                                            if (value != null) value else "••••••••••••",
                                            fontSize = 14.sp,
                                            color = if (value != null) AccentVault else Color(0x55FFFFFF),
                                            letterSpacing = if (value != null) 0.sp else 2.sp,
                                        )
                                    }
                                    IconButton(onClick = {
                                        scope.launch {
                                            if (value != null) {
                                                revealed = revealed - meta.id
                                            } else {
                                                val row = db.secretDao().getById(meta.id)
                                                if (row != null) revealed = revealed + (meta.id to CryptoManager.decrypt(row.ciphertext, row.iv))
                                            }
                                        }
                                    }) {
                                        Icon(
                                            if (value != null) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            "Toggle",
                                            tint = AccentVault.copy(alpha = 0.7f),
                                            modifier = Modifier.size(20.dp),
                                        )
                                    }
                                    IconButton(onClick = { openEdit(meta) }) {
                                        Icon(Icons.Default.Edit, "Edit", tint = Color(0x88FFFFFF), modifier = Modifier.size(20.dp))
                                    }
                                    IconButton(onClick = {
                                        scope.launch { db.secretDao().delete(meta.id); reload() }
                                    }) {
                                        Icon(Icons.Default.Delete, "Delete", tint = Color(0x88FFFFFF), modifier = Modifier.size(20.dp))
                                    }
                                }
                                if (meta.url.isNotBlank()) {
                                    Text(meta.url, fontSize = 11.sp, color = Color(0x66FFFFFF), maxLines = 1)
                                }
                                if (meta.description.isNotBlank()) {
                                    Text(meta.description, fontSize = 11.sp, color = Color(0x55FFFFFF), maxLines = 2)
                                }
                            }
                        }
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = { openAdd() },
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
            containerColor = AccentLime,
            shape = RoundedCornerShape(20.dp),
        ) {
            Icon(Icons.Default.Add, "Add secret", tint = BgDeep, modifier = Modifier.size(24.dp))
        }
    }

    if (showSheet) {
        val sheetState = rememberModalBottomSheetState()
        ModalBottomSheet(
            onDismissRequest = { showSheet = false },
            sheetState = sheetState,
            containerColor = Color(0xFF0D1117),
            dragHandle = null,
        ) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
                Row(
                    Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = { showSheet = false }) {
                        Text("Cancel", fontSize = 16.sp, color = Color(0x88FFFFFF))
                    }
                    Text(
                        if (editingId == null) "New Secret" else "Edit Secret",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                    )
                    TextButton(
                        onClick = { saveSecret() },
                        enabled = formLabel.isNotBlank() && (editingId != null || formValue.isNotEmpty()),
                    ) {
                        Text("Save", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = AccentVault)
                    }
                }

                HorizontalDivider(color = Color(0x20FFFFFF))
                Spacer(Modifier.height(16.dp))

                OutlinedTextField(
                    value = formLabel,
                    onValueChange = { formLabel = it },
                    label = { Text("Label", fontSize = 14.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = vaultFieldColors(),
                    textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = formValue,
                    onValueChange = { formValue = it },
                    label = {
                        Text(
                            if (editingId == null) "Value / Password" else "New value (empty = keep current)",
                            fontSize = 14.sp,
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    visualTransformation = if (formVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { formVisible = !formVisible }) {
                            Icon(
                                if (formVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                null,
                                tint = AccentVault.copy(alpha = 0.6f),
                            )
                        }
                    },
                    colors = vaultFieldColors(),
                    textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = formUrl,
                    onValueChange = { formUrl = it },
                    label = { Text("URL (optional)", fontSize = 14.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = vaultFieldColors(),
                    textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = formDesc,
                    onValueChange = { formDesc = it },
                    label = { Text("Description (optional)", fontSize = 14.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = vaultFieldColors(),
                    textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
                )
            }
        }
    }
}

@Composable
private fun vaultFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = AccentVault.copy(alpha = 0.7f),
    unfocusedBorderColor = BgCardBorder,
    focusedContainerColor = BgSurface,
    unfocusedContainerColor = BgSurface,
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedLabelColor = AccentVault,
    unfocusedLabelColor = Color(0x88FFFFFF),
)
