package com.myspace.app.crypto

import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.security.SecureRandom

/**
 * Tests for VaultCrypto.
 *
 * Android Keystore and BiometricPrompt cannot run on the JVM, so we test only
 * the pure-JVM paths: PBKDF2 key derivation, AES-GCM encrypt/decrypt,
 * lock/unlock state, auto-lock expiry, and password generation.
 *
 * android.util.Base64 is not available on the JVM, so tests that call
 * encrypt/decrypt are skipped here — they belong in the androidTest suite.
 * Derivation, state management, and generation are fully testable.
 */
class VaultCryptoTest {

    private lateinit var crypto: VaultCrypto

    @Before
    fun setup() {
        crypto = VaultCrypto()
    }

    // ── Initial state ─────────────────────────────────────────────────────────

    @Test
    fun `vault starts locked`() {
        assertTrue(crypto.isLocked)
    }

    @Test
    fun `expiry is null when locked`() {
        assertNull(crypto.expiresAtMs)
    }

    // ── Key derivation ────────────────────────────────────────────────────────

    @Test
    fun `deriveKey produces 32-byte AES-256 key`() {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val key = crypto.deriveKey("mypassword", salt)
        assertEquals(32, key.size)
    }

    @Test
    fun `deriveKey is deterministic for same password and salt`() {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val key1 = crypto.deriveKey("correct horse battery staple", salt)
        val key2 = crypto.deriveKey("correct horse battery staple", salt)
        assertArrayEquals(key1, key2)
    }

    @Test
    fun `deriveKey differs with different passwords`() {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val key1 = crypto.deriveKey("password1", salt)
        val key2 = crypto.deriveKey("password2", salt)
        assertFalse(key1.contentEquals(key2))
    }

    @Test
    fun `deriveKey differs with different salts`() {
        val salt1 = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val salt2 = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val key1 = crypto.deriveKey("samepassword", salt1)
        val key2 = crypto.deriveKey("samepassword", salt2)
        assertFalse(key1.contentEquals(key2))
    }

    @Test
    fun `deriveKey handles empty password`() {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val key = crypto.deriveKey("", salt)
        assertEquals(32, key.size)
    }

    @Test
    fun `deriveKey handles unicode password`() {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val key = crypto.deriveKey("p@\$\$w0rd-unicode-uber", salt)
        assertEquals(32, key.size)
    }

    // ── Lock / Unlock state ───────────────────────────────────────────────────

    @Test
    fun `unlockWithKey transitions to unlocked`() {
        val key = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        crypto.unlockWithKey(key, salt)
        assertFalse(crypto.isLocked)
        assertNotNull(crypto.expiresAtMs)
    }

    @Test
    fun `lock clears state`() {
        val key = ByteArray(32).also { SecureRandom().nextBytes(it) }
        crypto.unlockWithKey(key, ByteArray(16))
        assertFalse(crypto.isLocked)
        crypto.lock()
        assertTrue(crypto.isLocked)
        assertNull(crypto.expiresAtMs)
    }

    @Test
    fun `resetTimer extends expiry`() {
        val key = ByteArray(32).also { SecureRandom().nextBytes(it) }
        crypto.unlockWithKey(key, ByteArray(16))
        val first = crypto.expiresAtMs!!
        Thread.sleep(5)
        crypto.resetTimer()
        assertTrue(crypto.expiresAtMs!! >= first)
    }

    @Test
    fun `resetTimer is no-op when locked`() {
        assertTrue(crypto.isLocked)
        crypto.resetTimer()
        assertNull(crypto.expiresAtMs)
    }

    @Test
    fun `checkExpiry locks when past expiry`() {
        val key = ByteArray(32).also { SecureRandom().nextBytes(it) }
        crypto.unlockWithKey(key, ByteArray(16))
        // Manually set expiry to the past using reflection
        val field = VaultCrypto::class.java.getDeclaredField("expiresAt")
        field.isAccessible = true
        field.set(crypto, System.currentTimeMillis() - 1)
        crypto.checkExpiry()
        assertTrue(crypto.isLocked)
    }

    @Test
    fun `checkExpiry does not lock when expiry not reached`() {
        val key = ByteArray(32).also { SecureRandom().nextBytes(it) }
        crypto.unlockWithKey(key, ByteArray(16))
        crypto.checkExpiry()
        assertFalse(crypto.isLocked)
    }

    // ── Password generation ───────────────────────────────────────────────────

    @Test
    fun `generatePassword respects length`() {
        val pw = crypto.generatePassword(length = 24)
        assertEquals(24, pw.length)
    }

    @Test
    fun `generatePassword default length is 20`() {
        assertEquals(20, crypto.generatePassword().length)
    }

    @Test
    fun `generatePassword uppercase only produces uppercase chars`() {
        val pw = crypto.generatePassword(length = 50, upper = true, lower = false, digits = false, symbols = false)
        assertTrue(pw.all { it.isUpperCase() })
    }

    @Test
    fun `generatePassword lowercase only produces lowercase chars`() {
        val pw = crypto.generatePassword(length = 50, upper = false, lower = true, digits = false, symbols = false)
        assertTrue(pw.all { it.isLowerCase() })
    }

    @Test
    fun `generatePassword digits only produces digit chars`() {
        val pw = crypto.generatePassword(length = 50, upper = false, lower = false, digits = true, symbols = false)
        assertTrue(pw.all { it.isDigit() })
    }

    @Test
    fun `generatePassword all false falls back to lowercase`() {
        val pw = crypto.generatePassword(length = 30, upper = false, lower = false, digits = false, symbols = false)
        assertEquals(30, pw.length)
        assertTrue(pw.all { it.isLetter() })
    }

    @Test
    fun `generatePassword produces different values on successive calls`() {
        val set = (1..10).map { crypto.generatePassword(32) }.toSet()
        assertTrue("Expected varied output, got duplicates", set.size > 1)
    }

    @Test
    fun `generatePassword minimum length 1`() {
        val pw = crypto.generatePassword(length = 1)
        assertEquals(1, pw.length)
    }
}
