package com.myspace.app.data.dao

import androidx.room.*
import com.myspace.app.data.entity.*
import kotlinx.coroutines.flow.Flow

// ---- Notes DAO ----

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY updated_at DESC")
    fun observeAll(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NoteEntity?

    @Query("""
        SELECT * FROM notes
        WHERE (:query = '' OR title LIKE '%' || :query || '%' OR content LIKE '%' || :query || '%')
        ORDER BY updated_at DESC
    """)
    suspend fun search(query: String): List<NoteEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(note: NoteEntity)

    @Delete
    suspend fun delete(note: NoteEntity)

    @Query("DELETE FROM notes WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ---- Secrets DAO ----

@Dao
interface SecretDao {
    @Query("""
        SELECT * FROM secrets
        WHERE (:query = '' OR label LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%')
        ORDER BY updated_at DESC
    """)
    suspend fun search(query: String = ""): List<SecretEntity>

    @Query("SELECT * FROM secrets WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): SecretEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(secret: SecretEntity)

    @Query("DELETE FROM secrets WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ---- Subscriptions DAO ----

@Dao
interface SubscriptionDao {
    @Query("SELECT * FROM subscriptions ORDER BY name ASC")
    fun observeAll(): Flow<List<SubscriptionEntity>>

    @Query("SELECT * FROM subscriptions WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): SubscriptionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(sub: SubscriptionEntity)

    @Query("DELETE FROM subscriptions WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ---- Bills DAO ----

@Dao
interface BillDao {
    @Query("SELECT * FROM bills WHERE year = :year AND month = :month")
    suspend fun getByMonth(year: Int, month: Int): List<BillEntity>

    @Query("SELECT * FROM bills WHERE sub_id = :subId ORDER BY year DESC, month DESC")
    suspend fun getBySub(subId: String): List<BillEntity>

    @Query("SELECT * FROM bills ORDER BY year DESC, month DESC")
    suspend fun getAll(): List<BillEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(bill: BillEntity)

    @Query("DELETE FROM bills WHERE sub_id = :subId AND year = :year AND month = :month")
    suspend fun delete(subId: String, year: Int, month: Int)
}

// ---- Todo List DAO ----

@Dao
interface TodoListDao {
    @Query("SELECT * FROM todo_lists ORDER BY created_at ASC")
    fun observeAll(): Flow<List<TodoListEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(list: TodoListEntity)

    @Query("DELETE FROM todo_lists WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ---- Todo Task DAO ----

@Dao
interface TodoTaskDao {
    @Query("SELECT * FROM todo_tasks WHERE list_id = :listId ORDER BY due_date ASC, created_at ASC")
    fun observeByList(listId: String): Flow<List<TodoTaskEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(task: TodoTaskEntity)

    @Query("DELETE FROM todo_tasks WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ---- Map Stack DAO ----

@Dao
interface MapStackDao {
    @Query("SELECT * FROM map_stacks ORDER BY created_at ASC")
    fun observeAll(): Flow<List<MapStackEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(stack: MapStackEntity)

    @Query("DELETE FROM map_stacks WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ---- Map Pin DAO ----

@Dao
interface MapPinDao {
    @Query("SELECT * FROM map_pins WHERE stack_id = :stackId ORDER BY created_at DESC")
    fun observeByStack(stackId: String): Flow<List<MapPinEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(pin: MapPinEntity)

    @Query("DELETE FROM map_pins WHERE id = :id")
    suspend fun deleteById(id: String)
}
