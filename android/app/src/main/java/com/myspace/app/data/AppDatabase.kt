package com.myspace.app.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val tags: String,       // JSON array string
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(tableName = "secrets")
data class SecretEntity(
    @PrimaryKey val id: String,
    val label: String,
    val ciphertext: String,
    val iv: String,
    val tags: String,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(tableName = "subscriptions")
data class SubscriptionEntity(
    @PrimaryKey val id: String,
    val name: String,
    val amount: Double,
    val currency: String,
    val cycle: String,      // monthly | yearly | weekly | one-time
    val startDate: String,  // ISO date yyyy-MM-dd
    val tags: String,
    val notes: String,
    val createdAt: Long,
    val updatedAt: Long,
)

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY updatedAt DESC")
    suspend fun getAll(): List<NoteEntity>

    @Query("SELECT * FROM notes WHERE title LIKE '%' || :q || '%' OR content LIKE '%' || :q || '%' ORDER BY updatedAt DESC")
    suspend fun search(q: String): List<NoteEntity>

    @Query("SELECT * FROM notes WHERE id = :id")
    suspend fun getById(id: String): NoteEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(note: NoteEntity)

    @Query("DELETE FROM notes WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM notes")
    suspend fun deleteAll()
}

@Dao
interface SecretDao {
    @Query("SELECT id, label, tags, createdAt, updatedAt FROM secrets ORDER BY updatedAt DESC")
    suspend fun getMeta(): List<SecretMeta>

    @Query("SELECT * FROM secrets WHERE id = :id")
    suspend fun getById(id: String): SecretEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(secret: SecretEntity)

    @Query("DELETE FROM secrets WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM secrets")
    suspend fun deleteAll()

    @Query("SELECT * FROM secrets")
    suspend fun getAll(): List<SecretEntity>
}

data class SecretMeta(val id: String, val label: String, val tags: String, val createdAt: Long, val updatedAt: Long)

@Dao
interface SubscriptionDao {
    @Query("SELECT * FROM subscriptions ORDER BY updatedAt DESC")
    suspend fun getAll(): List<SubscriptionEntity>

    @Query("SELECT * FROM subscriptions WHERE id = :id")
    suspend fun getById(id: String): SubscriptionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(sub: SubscriptionEntity)

    @Query("DELETE FROM subscriptions WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM subscriptions")
    suspend fun deleteAll()
}

@Database(
    entities = [NoteEntity::class, SecretEntity::class, SubscriptionEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
    abstract fun secretDao(): SecretDao
    abstract fun subscriptionDao(): SubscriptionDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun get(context: Context): AppDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(context, AppDatabase::class.java, "myspace.db")
                .build()
                .also { INSTANCE = it }
        }
    }
}
