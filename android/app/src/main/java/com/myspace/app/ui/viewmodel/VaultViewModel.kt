package com.myspace.app.ui.viewmodel

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.byteArrayPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.crypto.VaultCrypto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject

@HiltViewModel
class VaultViewModel @Inject constructor(
    private val crypto: VaultCrypto,
    private val dataStore: DataStore<Preferences>
) : ViewModel() {

    private val saltKey        = byteArrayPreferencesKey("vault_salt")
    private val wrappedKeyKey  = stringPreferencesKey("biometric_wrapped_key")  // base64 AES-GCM(wrapping, vaultKey)
    private val wrappedIvKey   = stringPreferencesKey("biometric_wrapped_iv")
    private val bioKeystoreAlias = "myspace_bio_wrapping_key"

    private val _unlocked = MutableStateFlow(false)
    val unlocked: StateFlow<Boolean> = _unlocked.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _biometricAvailable = MutableStateFlow(false)
    val biometricAvailable: StateFlow<Boolean> = _biometricAvailable.asStateFlow()

    val isLocked: Boolean get() = crypto.isLocked

    /** Call from the UI (Activity context) to check biometric capability. */
    fun checkBiometricAvailability(context: Context) {
        val mgr = BiometricManager.from(context)
        _biometricAvailable.value = mgr.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }

    // -------------------------------------------------------------------------
    // Password-based unlock
    // -------------------------------------------------------------------------

    fun unlock(password: String) {
        viewModelScope.launch {
            try {
                val prefs = dataStore.data.first()
                var salt = prefs[saltKey]
                if (salt == null) {
                    salt = java.security.SecureRandom().let { rng -> ByteArray(16).also(rng::nextBytes) }
                    dataStore.edit { it[saltKey] = salt }
                }
                crypto.unlock(password, salt)
                _error.value = null
                _unlocked.value = true
                // Opportunistically store wrapped key for biometric on next use
                storeWrappedKey(salt, password)
            } catch (e: Exception) {
                _error.value = "Wrong password or corrupted vault"
                _unlocked.value = false
            }
        }
    }

    fun lock() {
        crypto.lock()
        _unlocked.value = false
    }

    fun clearError() { _error.value = null }

    // -------------------------------------------------------------------------
    // Biometric unlock
    // -------------------------------------------------------------------------

    /**
     * Launches the biometric prompt. On success the wrapped vault key is
     * decrypted via the Keystore-backed key and the vault is unlocked without
     * the user re-entering their password.
     */
    fun promptBiometric(activity: FragmentActivity) {
        viewModelScope.launch {
            val prefs = dataStore.data.first()
            val wrappedB64 = prefs[wrappedKeyKey] ?: run {
                _error.value = "No biometric key stored — unlock with password first"
                return@launch
            }
            val ivB64 = prefs[wrappedIvKey] ?: return@launch

            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    viewModelScope.launch {
                        try {
                            val cipher = result.cryptoObject?.cipher
                                ?: getDecryptCipherForBiometric(ivB64)
                            val wrapped = Base64.decode(wrappedB64, Base64.NO_WRAP)
                            val vaultKeyBytes = cipher.doFinal(wrapped)
                            // Re-derive needs salt — we have it stored; just set key directly via internal unlock
                            val salt = dataStore.data.first()[saltKey] ?: ByteArray(16)
                            // We don't re-derive here; directly set the decrypted key
                            crypto.unlockWithKey(vaultKeyBytes, salt)
                            _error.value = null
                            _unlocked.value = true
                        } catch (e: Exception) {
                            _error.value = "Biometric decryption failed"
                        }
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    _error.value = errString.toString()
                }

                override fun onAuthenticationFailed() {
                    _error.value = "Biometric not recognised"
                }
            })

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock My SPACE")
                .setSubtitle("Use biometric to unlock your vault")
                .setNegativeButtonText("Use password")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()

            try {
                val cipher = getDecryptCipherForBiometric(ivB64)
                prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
            } catch (e: Exception) {
                prompt.authenticate(promptInfo)
            }
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private suspend fun storeWrappedKey(salt: ByteArray, password: String) {
        try {
            val vaultKeyBytes = crypto.deriveKey(password, salt)
            val wrappingKey = getOrCreateBioWrappingKey()
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, wrappingKey)
            val wrapped = cipher.doFinal(vaultKeyBytes)
            dataStore.edit { prefs ->
                prefs[wrappedKeyKey] = Base64.encodeToString(wrapped, Base64.NO_WRAP)
                prefs[wrappedIvKey]  = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
            }
        } catch (_: Exception) { /* biometric not available — ignore */ }
    }

    private fun getDecryptCipherForBiometric(ivB64: String): Cipher {
        val iv = Base64.decode(ivB64, Base64.NO_WRAP)
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val key = (ks.getEntry(bioKeystoreAlias, null) as KeyStore.SecretKeyEntry).secretKey
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
        return cipher
    }

    private fun getOrCreateBioWrappingKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (ks.containsAlias(bioKeystoreAlias)) {
            return (ks.getEntry(bioKeystoreAlias, null) as KeyStore.SecretKeyEntry).secretKey
        }
        val spec = KeyGenParameterSpec.Builder(
            bioKeystoreAlias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(false)
            .build()
        KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(spec)
            generateKey()
        }
        return (ks.getEntry(bioKeystoreAlias, null) as KeyStore.SecretKeyEntry).secretKey
    }
}
