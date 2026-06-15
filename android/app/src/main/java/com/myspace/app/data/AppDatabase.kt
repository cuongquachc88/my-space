package com.myspace.app.data

import android.content.Context
import androidx.room.*

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val tags: String,
    val imageUris: String = "",
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
    val logoUri: String = "",
    val active: Boolean = true,
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
    @Query("SELECT * FROM subscriptions ORDER BY name ASC")
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
    version = 5,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
    abstract fun secretDao(): SecretDao
    abstract fun subscriptionDao(): SubscriptionDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        private val MIGRATION_1_2 = object : androidx.room.migration.Migration(1, 2) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE subscriptions ADD COLUMN logoUri TEXT NOT NULL DEFAULT ''")
            }
        }

        private val MIGRATION_2_3 = object : androidx.room.migration.Migration(2, 3) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE notes ADD COLUMN imageUris TEXT NOT NULL DEFAULT ''")
            }
        }

        private val MIGRATION_3_4 = object : androidx.room.migration.Migration(3, 4) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE subscriptions ADD COLUMN active INTEGER NOT NULL DEFAULT 1")
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS bills (
                        subId TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL,
                        amount REAL NOT NULL, currency TEXT NOT NULL,
                        notes TEXT NOT NULL DEFAULT '', updatedAt INTEGER NOT NULL,
                        PRIMARY KEY (subId, year, month)
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_4_5 = object : androidx.room.migration.Migration(4, 5) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("DROP TABLE IF EXISTS bills")
            }
        }

        fun get(context: Context): AppDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(context, AppDatabase::class.java, "myspace.db")
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5)
                .build()
                .also { INSTANCE = it }
        }
    }
}
