package com.myspace.app.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.byteArrayPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.service.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Full Google Drive sync implementation.
 *
 * OAuth uses a Chrome Custom Tab launched to Google's auth endpoint.
 * The redirect URI is com.myspace.app://oauth-callback — handled in MainActivity.
 * The access token is stored in DataStore (non-persistent; session only).
 *
 * Replace GOOGLE_CLIENT_ID with a real OAuth 2.0 client ID from Google Cloud Console.
 */
@HiltViewModel
class SyncViewModel @Inject constructor(
    private val syncRepo: SyncRepository,
    private val dataStore: DataStore<Preferences>,
    @ApplicationContext private val context: Context
) : ViewModel() {

    companion object {
        // TODO: Replace with your real Google OAuth 2.0 client ID
        const val GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
        const val REDIRECT_URI     = "com.myspace.app://oauth-callback"
        const val SCOPE            = "https://www.googleapis.com/auth/drive.appdata"
        const val AUTH_ENDPOINT    = "https://accounts.google.com/o/oauth2/v2/auth"
    }

    private val tokenKey     = stringPreferencesKey("drive_access_token")
    private val accountKey   = stringPreferencesKey("drive_account_email")
    private val saltKey      = byteArrayPreferencesKey("vault_salt")
    private val lastSyncKey  = stringPreferencesKey("last_sync_time")

    private val _status = MutableStateFlow("Not connected")
    val status: StateFlow<String> = _status.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _accountEmail = MutableStateFlow<String?>(null)
    val accountEmail: StateFlow<String?> = _accountEmail.asStateFlow()

    private val _lastSync = MutableStateFlow<String?>(null)
    val lastSync: StateFlow<String?> = _lastSync.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        viewModelScope.launch {
            dataStore.data.collect { prefs ->
                val token = prefs[tokenKey]
                _accountEmail.value = prefs[accountKey]
                _lastSync.value     = prefs[lastSyncKey]
                _status.value = if (token != null) "Connected" else "Not connected"
            }
        }
    }

    /** Build and open the Google OAuth URL in a Chrome Custom Tab / browser. */
    fun signIn(launchUrl: (Intent) -> Unit) {
        val authUrl = Uri.parse(AUTH_ENDPOINT).buildUpon()
            .appendQueryParameter("client_id", GOOGLE_CLIENT_ID)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("response_type", "token")
            .appendQueryParameter("scope", SCOPE)
            .appendQueryParameter("access_type", "online")
            .build()

        val intent = Intent(Intent.ACTION_VIEW, authUrl).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        launchUrl(intent)
        _status.value = "Waiting for Google sign-in…"
    }

    /** Called from MainActivity after the OAuth redirect returns with a token. */
    fun handleOAuthCallback(uri: Uri) {
        viewModelScope.launch {
            val fragment = uri.fragment ?: return@launch
            val params = fragment.split("&").associate {
                val (k, v) = it.split("=", limit = 2)
                k to Uri.decode(v)
            }
            val token = params["access_token"] ?: run {
                _error.value = "OAuth failed: no access token received"
                return@launch
            }
            dataStore.edit { prefs ->
                prefs[tokenKey] = token
                // Try to extract hint from id_token (not always present in implicit flow)
                prefs[accountKey] = params["login_hint"] ?: "Google Account"
            }
            _status.value = "Connected"
        }
    }

    fun signOut() {
        viewModelScope.launch {
            dataStore.edit { prefs ->
                prefs.remove(tokenKey)
                prefs.remove(accountKey)
            }
            _status.value = "Not connected"
        }
    }

    fun push() {
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            try {
                val prefs = dataStore.data.first()
                val token = prefs[tokenKey] ?: error("Not signed in to Google Drive")
                val salt  = prefs[saltKey]  ?: error("Vault salt not found — unlock vault first")
                syncRepo.push(token, salt)
                val now = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault())
                    .format(java.util.Date())
                dataStore.edit { it[lastSyncKey] = now }
                _status.value = "Uploaded at $now"
            } catch (e: Exception) {
                _error.value = "Upload failed: ${e.message}"
                _status.value = "Upload failed"
            } finally {
                _busy.value = false
            }
        }
    }

    fun pull() {
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            try {
                val prefs = dataStore.data.first()
                val token = prefs[tokenKey] ?: error("Not signed in to Google Drive")
                syncRepo.pull(token)
                val now = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault())
                    .format(java.util.Date())
                dataStore.edit { it[lastSyncKey] = now }
                _status.value = "Downloaded at $now"
            } catch (e: Exception) {
                _error.value = "Download failed: ${e.message}"
                _status.value = "Download failed"
            } finally {
                _busy.value = false
            }
        }
    }

    fun clearError() { _error.value = null }
}
