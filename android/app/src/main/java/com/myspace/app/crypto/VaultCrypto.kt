package com.myspace.app.crypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mirrors the extension's crypto.ts:
 *   - PBKDF2-SHA256, 600 000 iterations → AES-GCM-256 vault key (kept in memory)
 *   - Android Keystore AES-GCM wrapping key persists across app restarts
 *   - Auto-lock: clear in-memory key after idle timeout (15 min, matching extension)
 */
@Singleton
class VaultCrypto @Inject constructor() {

    private var vaultKey: ByteArray? = null
    private var expiresAt: Long? = null
    private val lockTimeoutMs = 15 * 60 * 1000L
    private val keystoreAlias = "myspace_wrapping_key"

    val isLocked: Boolean get() = vaultKey == null
    val expiresAtMs: Long? get() = expiresAt

    // -------------------------------------------------------------------------
    // Unlock / Lock
    // -------------------------------------------------------------------------

    fun unlock(password: String, salt: ByteArray) {
        vaultKey = deriveKey(password, salt)
        expiresAt = System.currentTimeMillis() + lockTimeoutMs
    }

    fun lock() {
        vaultKey?.fill(0)
        vaultKey = null
        expiresAt = null
    }

    fun resetTimer() {
        if (vaultKey == null) return
        expiresAt = System.currentTimeMillis() + lockTimeoutMs
    }

    fun checkExpiry() {
        val exp = expiresAt ?: return
        if (System.currentTimeMillis() >= exp) lock()
    }

    // -------------------------------------------------------------------------
    // Key derivation — PBKDF2-SHA256, 600 000 iterations (matches extension)
    // -------------------------------------------------------------------------

    fun deriveKey(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, 600_000, 256)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val key = factory.generateSecret(spec).encoded
        spec.clearPassword()
        return key
    }

    // -------------------------------------------------------------------------
    // AES-GCM encrypt / decrypt (matches extension encrypt/decrypt functions)
    // -------------------------------------------------------------------------

    fun encrypt(plaintext: String): EncryptResult {
        val key = requireKey()
        val cipher = aesCipher()
        cipher.init(Cipher.ENCRYPT_MODE, rawToSecretKey(key))
        val cipherBytes = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return EncryptResult(
            ciphertext = android.util.Base64.encodeToString(cipherBytes, android.util.Base64.NO_WRAP),
            iv = android.util.Base64.encodeToString(cipher.iv, android.util.Base64.NO_WRAP)
        )
    }

    fun decrypt(ciphertext: String, iv: String): String {
        val key = requireKey()
        val cipher = aesCipher()
        val ivBytes = android.util.Base64.decode(iv, android.util.Base64.NO_WRAP)
        cipher.init(Cipher.DECRYPT_MODE, rawToSecretKey(key), GCMParameterSpec(128, ivBytes))
        val plainBytes = cipher.doFinal(android.util.Base64.decode(ciphertext, android.util.Base64.NO_WRAP))
        return String(plainBytes, Charsets.UTF_8)
    }

    // decrypt with an explicit key (used for Drive import with different salt)
    fun decryptWithKey(keyBytes: ByteArray, ciphertext: String, iv: String): String {
        val cipher = aesCipher()
        val ivBytes = android.util.Base64.decode(iv, android.util.Base64.NO_WRAP)
        cipher.init(Cipher.DECRYPT_MODE, rawToSecretKey(keyBytes), GCMParameterSpec(128, ivBytes))
        val plainBytes = cipher.doFinal(android.util.Base64.decode(ciphertext, android.util.Base64.NO_WRAP))
        return String(plainBytes, Charsets.UTF_8)
    }

    // -------------------------------------------------------------------------
    // Android Keystore — wrapping key for persisting salt securely
    // -------------------------------------------------------------------------

    fun getOrCreateWrappingKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (ks.containsAlias(keystoreAlias)) {
            return (ks.getEntry(keystoreAlias, null) as KeyStore.SecretKeyEntry).secretKey
        }
        val spec = KeyGenParameterSpec.Builder(
            keystoreAlias,
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
        return (ks.getEntry(keystoreAlias, null) as KeyStore.SecretKeyEntry).secretKey
    }

    // -------------------------------------------------------------------------
    // Password generation (mirrors extension generatePassword.ts)
    // -------------------------------------------------------------------------

    fun generatePassword(
        length: Int = 20,
        upper: Boolean = true,
        lower: Boolean = true,
        digits: Boolean = true,
        symbols: Boolean = true
    ): String {
        val charset = buildString {
            if (upper) append("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
            if (lower) append("abcdefghijklmnopqrstuvwxyz")
            if (digits) append("0123456789")
            if (symbols) append("!@#\$%^&*()-_=+[]{}|;:,.<>?")
        }.ifEmpty { "abcdefghijklmnopqrstuvwxyz" }
        return (1..length).map { charset[java.security.SecureRandom().nextInt(charset.length)] }.joinToString("")
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun requireKey(): ByteArray = vaultKey ?: error("Vault is locked")

    private fun aesCipher() = Cipher.getInstance("AES/GCM/NoPadding")

    private fun rawToSecretKey(bytes: ByteArray): SecretKey =
        javax.crypto.spec.SecretKeySpec(bytes, "AES")

    data class EncryptResult(val ciphertext: String, val iv: String)

    /** Unlock directly with an already-derived key (biometric path). */
    fun unlockWithKey(keyBytes: ByteArray, salt: ByteArray) {
        vaultKey = keyBytes.copyOf()
        expiresAt = System.currentTimeMillis() + lockTimeoutMs
    }
}
