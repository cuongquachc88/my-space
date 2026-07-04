package com.myspace.app

import com.myspace.app.ui.screens.generatePassword
import org.junit.Assert.*
import org.junit.Test

class GeneratorTest {

    @Test fun `generated password has requested length`() {
        assertEquals(20, generatePassword(20, upper = true, digits = true, symbols = false).length)
        assertEquals(8,  generatePassword(8,  upper = false, digits = true, symbols = false).length)
        assertEquals(64, generatePassword(64, upper = true, digits = true, symbols = true).length)
    }

    @Test fun `lowercase always included in pool`() {
        val pw = generatePassword(200, upper = false, digits = false, symbols = false)
        assertTrue("should contain lowercase", pw.any { it.isLowerCase() })
        assertFalse("should not contain uppercase", pw.any { it.isUpperCase() })
        assertFalse("should not contain digit", pw.any { it.isDigit() })
    }

    @Test fun `uppercase included when flag is true`() {
        val pw = generatePassword(200, upper = true, digits = false, symbols = false)
        assertTrue(pw.any { it.isUpperCase() })
    }

    @Test fun `digits included when flag is true`() {
        val pw = generatePassword(200, upper = false, digits = true, symbols = false)
        assertTrue(pw.any { it.isDigit() })
    }

    @Test fun `symbols included when flag is true`() {
        val symbols = "!@#\$%^&*()-_=+[]{}|;:,.<>?"
        val pw = generatePassword(200, upper = false, digits = false, symbols = true)
        assertTrue(pw.any { it in symbols })
    }

    @Test fun `consecutive calls produce different passwords`() {
        val pw1 = generatePassword(20, upper = true, digits = true, symbols = false)
        val pw2 = generatePassword(20, upper = true, digits = true, symbols = false)
        assertNotEquals(pw1, pw2)
    }
}
