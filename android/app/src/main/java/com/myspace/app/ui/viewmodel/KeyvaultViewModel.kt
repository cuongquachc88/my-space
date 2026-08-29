package com.myspace.app.ui.viewmodel

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.crypto.VaultCrypto
import com.myspace.app.data.dao.SecretDao
import com.myspace.app.data.entity.SecretEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class KeyvaultViewModel @Inject constructor(
    private val dao: SecretDao,
    private val crypto: VaultCrypto,
    @ApplicationContext private val ctx: Context
) : ViewModel() {

    private val _query = MutableStateFlow("")
    val secrets: StateFlow<List<SecretEntity>> = _query
        .debounce(200)
        .flatMapLatest { q -> flow { emit(dao.search(q)) } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun search(q: String) { _query.value = q }

    fun addSecret(label: String, value: String, url: String, description: String) {
        viewModelScope.launch {
            val enc = crypto.encrypt(value)
            dao.upsert(SecretEntity(
                id = UUID.randomUUID().toString(),
                label = label,
                ciphertext = enc.ciphertext,
                iv = enc.iv,
                tags = "[]",
                url = url,
                description = description
            ))
            _query.value = _query.value  // trigger refresh
        }
    }

    fun copySecret(id: String) {
        viewModelScope.launch {
            val secret = dao.getById(id) ?: return@launch
            val plaintext = crypto.decrypt(secret.ciphertext, secret.iv)
            val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("secret", plaintext))
        }
    }

    fun delete(id: String) {
        viewModelScope.launch { dao.deleteById(id) }
    }

    fun lock() { crypto.lock() }

    /** Returns decrypted value synchronously (only works when vault is unlocked). */
    fun revealSecret(id: String): String {
        // We need a blocking call here — this is only called from UI thread in compose
        // Use runBlocking for simplicity since vault crypto is fast (in-memory).
        return kotlinx.coroutines.runBlocking {
            val secret = dao.getById(id) ?: return@runBlocking ""
            crypto.decrypt(secret.ciphertext, secret.iv)
        }
    }
}
