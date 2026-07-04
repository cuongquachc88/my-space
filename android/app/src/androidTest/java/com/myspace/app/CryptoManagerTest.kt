package com.myspace.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.myspace.app.crypto.CryptoManager
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import javax.crypto.AEADBadTagException
import android.util.Base64

@RunWith(AndroidJUnit4::class)
class CryptoManagerTest {

    @Test fun encryptDecryptRoundTrip() {
        val plaintext = "super-secret-password-123"
        val (ct, iv) = CryptoManager.encrypt(plaintext)
        val decrypted = CryptoManager.decrypt(ct, iv)
        assertEquals(plaintext, decrypted)
    }

    @Test fun encryptDecryptEmptyString() {
        val (ct, iv) = CryptoManager.encrypt("")
        assertEquals("", CryptoManager.decrypt(ct, iv))
    }

    @Test fun encryptDecryptUnicode() {
        val plaintext = "パスワード 🔐 тест"
        val (ct, iv) = CryptoManager.encrypt(plaintext)
        assertEquals(plaintext, CryptoManager.decrypt(ct, iv))
    }

    @Test fun twoEncryptionsProduceDifferentCiphertext() {
        val (ct1, _) = CryptoManager.encrypt("same-input")
        val (ct2, _) = CryptoManager.encrypt("same-input")
        assertNotEquals(ct1, ct2)
    }

    @Test fun twoEncryptionsProduceDifferentIVs() {
        val (_, iv1) = CryptoManager.encrypt("test")
        val (_, iv2) = CryptoManager.encrypt("test")
        assertNotEquals(iv1, iv2)
    }

    @Test fun decryptWithWrongIVThrows() {
        val (ct, _) = CryptoManager.encrypt("hello")
        val (_, wrongIv) = CryptoManager.encrypt("other")
        try {
            CryptoManager.decrypt(ct, wrongIv)
            fail("Expected AEADBadTagException")
        } catch (e: AEADBadTagException) {
            // expected
        }
    }
}
