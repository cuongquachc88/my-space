package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * TODO: Implement Google Drive sync using the same Drive appDataFolder file
 * (myspace-backup.json) and the same JSON format as the Chrome extension.
 * Data is AES-GCM encrypted with the vault key before upload, so the extension
 * and Android app share the same backup — decryption works cross-platform as
 * long as the vault password matches.
 *
 * OAuth flow: Chrome Custom Tab → Google consent → deep link back to app
 * (com.myspace.app://oauth-callback) → exchange code for token via Cloudflare proxy.
 */
@HiltViewModel
class SyncViewModel @Inject constructor() : ViewModel() {

    private val _status = MutableStateFlow("Not connected")
    val status: StateFlow<String> = _status

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy

    fun signIn() {
        // TODO: Launch Chrome Custom Tab OAuth flow
        _status.value = "Sign-in not yet implemented"
    }

    fun push() {
        viewModelScope.launch {
            _busy.value = true
            // TODO: serialize DB → JSON → encrypt → upload to Drive appDataFolder
            _status.value = "Push not yet implemented"
            _busy.value = false
        }
    }

    fun pull() {
        viewModelScope.launch {
            _busy.value = true
            // TODO: download from Drive → decrypt → import into Room
            _status.value = "Pull not yet implemented"
            _busy.value = false
        }
    }
}
