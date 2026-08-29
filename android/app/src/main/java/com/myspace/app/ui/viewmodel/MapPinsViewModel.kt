package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.data.dao.MapPinDao
import com.myspace.app.data.dao.MapStackDao
import com.myspace.app.data.entity.MapPinEntity
import com.myspace.app.data.entity.MapStackEntity
import com.myspace.app.util.MapUrlParser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class MapPinsViewModel @Inject constructor(
    private val stackDao: MapStackDao,
    private val pinDao: MapPinDao
) : ViewModel() {

    val stacks = stackDao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addStack(name: String) {
        viewModelScope.launch {
            stackDao.upsert(MapStackEntity(id = UUID.randomUUID().toString(), name = name, color = "#34d399"))
        }
    }

    fun deleteStack(id: String) { viewModelScope.launch { stackDao.deleteById(id) } }

    fun pinsFor(stackId: String) = pinDao.observeByStack(stackId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addPinFromUrl(stackId: String, label: String, url: String) {
        viewModelScope.launch {
            val coords = MapUrlParser.parse(url)
            pinDao.upsert(MapPinEntity(
                id = UUID.randomUUID().toString(),
                stackId = stackId,
                label = label,
                lat = coords?.first ?: 0.0,
                lng = coords?.second ?: 0.0,
                url = url
            ))
        }
    }

    fun deletePin(id: String) { viewModelScope.launch { pinDao.deleteById(id) } }
}
