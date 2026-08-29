package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.myspace.app.crypto.VaultCrypto
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class GeneratorViewModel @Inject constructor(private val crypto: VaultCrypto) : ViewModel() {
    fun generate(length: Int, upper: Boolean, lower: Boolean, digits: Boolean, symbols: Boolean): String =
        crypto.generatePassword(length, upper, lower, digits, symbols)
}
