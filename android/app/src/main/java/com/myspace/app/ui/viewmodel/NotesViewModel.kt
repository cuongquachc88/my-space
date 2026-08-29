package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.data.dao.NoteDao
import com.myspace.app.data.entity.NoteEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject



@HiltViewModel
class NotesViewModel @Inject constructor(private val dao: NoteDao) : ViewModel() {

    private val _query = MutableStateFlow("")

    @OptIn(ExperimentalCoroutinesApi::class)
    val notes: StateFlow<List<NoteEntity>> = _query
        .debounce(200)
        .flatMapLatest { q ->
            if (q.isBlank()) dao.observeAll()
            else flow { emit(dao.search(q)) }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun search(q: String) { _query.value = q }

    fun save(id: String?, title: String, content: String, tags: List<String>, imageData: String) {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val tagsJson = tags.joinToString(",", "[", "]") { "\"${it.replace("\"", "\\\"")}\"" }
            val entity = NoteEntity(
                id = id ?: UUID.randomUUID().toString(),
                title = title.ifBlank { "Untitled" },
                content = content,
                tags = tagsJson,
                imageData = imageData,
                updatedAt = now,
                createdAt = now
            )
            dao.upsert(entity)
        }
    }

    fun delete(id: String) { viewModelScope.launch { dao.deleteById(id) } }

    fun getById(id: String): Flow<NoteEntity?> = flow { emit(dao.getById(id)) }
}
