package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.data.dao.TodoListDao
import com.myspace.app.data.dao.TodoTaskDao
import com.myspace.app.data.entity.TodoListEntity
import com.myspace.app.data.entity.TodoTaskEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class TodosViewModel @Inject constructor(
    private val listDao: TodoListDao,
    private val taskDao: TodoTaskDao
) : ViewModel() {

    val lists = listDao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addList(name: String) {
        viewModelScope.launch {
            listDao.upsert(TodoListEntity(id = UUID.randomUUID().toString(), name = name, color = "#6ee7b7"))
        }
    }

    fun deleteList(id: String) { viewModelScope.launch { listDao.deleteById(id) } }

    fun tasksFor(listId: String) = taskDao.observeByList(listId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addTask(listId: String, title: String, priority: String, dueDate: Long?) {
        viewModelScope.launch {
            taskDao.upsert(TodoTaskEntity(
                id = UUID.randomUUID().toString(),
                listId = listId,
                title = title,
                priority = priority,
                dueDate = dueDate
            ))
        }
    }

    fun toggleTask(task: TodoTaskEntity) {
        viewModelScope.launch { taskDao.upsert(task.copy(done = !task.done)) }
    }

    fun deleteTask(id: String) { viewModelScope.launch { taskDao.deleteById(id) } }
}
