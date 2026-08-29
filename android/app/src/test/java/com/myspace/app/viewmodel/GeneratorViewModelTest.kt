package com.myspace.app.viewmodel

import com.myspace.app.crypto.VaultCrypto
import com.myspace.app.ui.viewmodel.GeneratorViewModel
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class GeneratorViewModelTest {

    private val crypto: VaultCrypto = mockk()
    private lateinit var vm: GeneratorViewModel

    @Before
    fun setup() {
        vm = GeneratorViewModel(crypto)
    }

    @Test
    fun `generate delegates to VaultCrypto with correct params`() {
        every { crypto.generatePassword(24, true, false, true, false) } returns "ABCD1234ABCD1234ABCD1234"

        val result = vm.generate(24, true, false, true, false)

        assertEquals("ABCD1234ABCD1234ABCD1234", result)
        verify { crypto.generatePassword(24, true, false, true, false) }
    }

    @Test
    fun `generate returns whatever crypto returns`() {
        every { crypto.generatePassword(any(), any(), any(), any(), any()) } returns "xyz"
        assertEquals("xyz", vm.generate(10, true, true, true, true))
    }

    @Test
    fun `generate passes all four charset flags through`() {
        every { crypto.generatePassword(8, false, true, false, true) } returns "abcd!@#$"

        val result = vm.generate(8, false, true, false, true)

        assertEquals("abcd!@#$", result)
        verify(exactly = 1) { crypto.generatePassword(8, false, true, false, true) }
    }

    @Test
    fun `generate with length 64 is accepted`() {
        val long = "a".repeat(64)
        every { crypto.generatePassword(64, any(), any(), any(), any()) } returns long
        assertEquals(64, vm.generate(64, true, true, true, true).length)
    }
}
