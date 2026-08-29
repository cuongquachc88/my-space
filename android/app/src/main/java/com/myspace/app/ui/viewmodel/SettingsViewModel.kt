package com.myspace.app.ui.viewmodel

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val biometricKey = booleanPreferencesKey("biometric_enabled")
    private val lockTimeoutKey = intPreferencesKey("lock_timeout_minutes")

    val biometricEnabled: StateFlow<Boolean> = dataStore.data
        .map { it[biometricKey] ?: false }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val lockTimeout: StateFlow<Int> = dataStore.data
        .map { it[lockTimeoutKey] ?: 15 }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 15)

    private val _biometricAvailable = MutableStateFlow(false)
    val biometricAvailable: StateFlow<Boolean> = _biometricAvailable.asStateFlow()

    init {
        val bm = BiometricManager.from(context)
        _biometricAvailable.value = bm.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun setBiometric(enabled: Boolean) {
        viewModelScope.launch {
            dataStore.edit { it[biometricKey] = enabled }
        }
    }

    fun setLockTimeout(minutes: Int) {
        viewModelScope.launch {
            dataStore.edit { it[lockTimeoutKey] = minutes }
        }
    }
}
