package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.data.dao.SubscriptionDao
import com.myspace.app.data.entity.SubscriptionEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class SubscriptionsViewModel @Inject constructor(private val dao: SubscriptionDao) : ViewModel() {

    val subscriptions = dao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun add(name: String, amount: Double, currency: String, cycle: String) {
        viewModelScope.launch {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            dao.upsert(SubscriptionEntity(
                id = UUID.randomUUID().toString(),
                name = name, amount = amount, currency = currency,
                cycle = cycle, startDate = today
            ))
        }
    }

    fun toggleActive(sub: SubscriptionEntity) {
        viewModelScope.launch { dao.upsert(sub.copy(active = !sub.active)) }
    }

    fun delete(id: String) { viewModelScope.launch { dao.deleteById(id) } }
}
