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
    val url: String = "",
    val description: String = "",
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

@Entity(
    tableName = "bills",
    primaryKeys = ["subId", "year", "month"],
)
data class BillEntity(
    val subId: String,
    val year: Int,
    val month: Int,
    val amount: Double,
    val currency: String,
    val notes: String = "",
    val updatedAt: Long,
)

@Entity(tableName = "todo_lists")
data class TodoListEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String,   // hex e.g. "#38BDF8"
    val icon: String = "",
    val createdAt: Long,
)

@Entity(tableName = "todo_tasks")
data class TodoTaskEntity(
    @PrimaryKey val id: String,
    val listId: String,
    val title: String,
    val note: String = "",
    val priority: String = "medium",  // "low"|"medium"|"high"
    val dueDate: String? = null,       // ISO date yyyy-MM-dd or null
    val recurrence: String = "none",   // "none"|"daily"|"weekly"|"monthly"
    val done: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(tableName = "map_stacks")
data class MapStackEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String,   // hex
    val icon: String = "",
    val createdAt: Long,
)

@Entity(tableName = "map_pins")
data class MapPinEntity(
    @PrimaryKey val id: String,
    val stackId: String,
    val label: String,
    val lat: Double,
    val lng: Double,
    val url: String = "",
    val note: String = "",
    val priority: String = "none",    // "none"|"low"|"medium"|"high"
    val category: String = "",
    val rating: Int = 0,
    val reviewNote: String = "",
    val createdAt: Long,
)

// ── DAOs ─────────────────────────────────────────────────────────────────────

@Dao
interface BillDao {
    @Query("SELECT * FROM bills WHERE subId = :subId ORDER BY year DESC, month DESC")
    suspend fun getForSub(subId: String): List<BillEntity>

    @Query("SELECT * FROM bills WHERE year = :year AND month = :month ORDER BY subId ASC")
    suspend fun getForMonth(year: Int, month: Int): List<BillEntity>

    @Query("SELECT * FROM bills ORDER BY year DESC, month DESC")
    suspend fun getAll(): List<BillEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(bill: BillEntity)

    @Query("DELETE FROM bills WHERE subId = :subId AND year = :year AND month = :month")
    suspend fun delete(subId: String, year: Int, month: Int)

    @Query("DELETE FROM bills WHERE subId = :subId")
    suspend fun deleteForSub(subId: String)

    @Query("DELETE FROM bills")
    suspend fun deleteAll()
}

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
    @Query("SELECT id, label, tags, url, description, createdAt, updatedAt FROM secrets ORDER BY updatedAt DESC")
    suspend fun getMeta(): List<SecretMeta>

    @Query("SELECT id, label, tags, url, description, createdAt, updatedAt FROM secrets WHERE label LIKE '%' || :q || '%' ORDER BY updatedAt DESC")
    suspend fun searchMeta(q: String): List<SecretMeta>

    @Query("SELECT id, label, tags, url, description, createdAt, updatedAt FROM secrets WHERE INSTR(tags, :tag) > 0 ORDER BY updatedAt DESC")
    suspend fun getMetaByTag(tag: String): List<SecretMeta>

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

data class SecretMeta(val id: String, val label: String, val tags: String, val url: String, val description: String, val createdAt: Long, val updatedAt: Long)

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

@Dao
interface TodoListDao {
    @Query("SELECT * FROM todo_lists ORDER BY createdAt ASC")
    suspend fun getAll(): List<TodoListEntity>

    @Query("SELECT * FROM todo_lists WHERE id = :id")
    suspend fun getById(id: String): TodoListEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(list: TodoListEntity)

    @Query("DELETE FROM todo_lists WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM todo_lists")
    suspend fun deleteAll()
}

@Dao
interface TodoTaskDao {
    @Query("SELECT * FROM todo_tasks ORDER BY createdAt ASC")
    suspend fun getAll(): List<TodoTaskEntity>

    @Query("SELECT * FROM todo_tasks WHERE id = :id")
    suspend fun getById(id: String): TodoTaskEntity?

    @Query("SELECT * FROM todo_tasks WHERE listId = :listId ORDER BY createdAt ASC")
    suspend fun getForList(listId: String): List<TodoTaskEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(task: TodoTaskEntity)

    @Query("DELETE FROM todo_tasks WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM todo_tasks WHERE listId = :listId")
    suspend fun deleteForList(listId: String)

    @Query("DELETE FROM todo_tasks")
    suspend fun deleteAll()
}

@Dao
interface MapStackDao {
    @Query("SELECT * FROM map_stacks ORDER BY createdAt ASC")
    suspend fun getAll(): List<MapStackEntity>

    @Query("SELECT * FROM map_stacks WHERE id = :id")
    suspend fun getById(id: String): MapStackEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(stack: MapStackEntity)

    @Query("DELETE FROM map_stacks WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM map_stacks")
    suspend fun deleteAll()
}

@Dao
interface MapPinDao {
    @Query("SELECT * FROM map_pins ORDER BY createdAt ASC")
    suspend fun getAll(): List<MapPinEntity>

    @Query("SELECT * FROM map_pins WHERE id = :id")
    suspend fun getById(id: String): MapPinEntity?

    @Query("SELECT * FROM map_pins WHERE stackId = :stackId ORDER BY createdAt ASC")
    suspend fun getForStack(stackId: String): List<MapPinEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(pin: MapPinEntity)

    @Query("DELETE FROM map_pins WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM map_pins WHERE stackId = :stackId")
    suspend fun deleteForStack(stackId: String)

    @Query("DELETE FROM map_pins")
    suspend fun deleteAll()
}

// ── Database ──────────────────────────────────────────────────────────────────

@Database(
    entities = [
        NoteEntity::class,
        SecretEntity::class,
        SubscriptionEntity::class,
        BillEntity::class,
        TodoListEntity::class,
        TodoTaskEntity::class,
        MapStackEntity::class,
        MapPinEntity::class,
    ],
    version = 8,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun noteDao(): NoteDao
    abstract fun secretDao(): SecretDao
    abstract fun subscriptionDao(): SubscriptionDao
    abstract fun billDao(): BillDao
    abstract fun todoListDao(): TodoListDao
    abstract fun todoTaskDao(): TodoTaskDao
    abstract fun mapStackDao(): MapStackDao
    abstract fun mapPinDao(): MapPinDao

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

        private val MIGRATION_5_6 = object : androidx.room.migration.Migration(5, 6) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
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

        private val MIGRATION_6_7 = object : androidx.room.migration.Migration(6, 7) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS todo_lists (
                        id TEXT NOT NULL PRIMARY KEY,
                        name TEXT NOT NULL,
                        color TEXT NOT NULL,
                        icon TEXT NOT NULL DEFAULT '',
                        createdAt INTEGER NOT NULL
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS todo_tasks (
                        id TEXT NOT NULL PRIMARY KEY,
                        listId TEXT NOT NULL,
                        title TEXT NOT NULL,
                        note TEXT NOT NULL DEFAULT '',
                        priority TEXT NOT NULL DEFAULT 'medium',
                        dueDate TEXT,
                        recurrence TEXT NOT NULL DEFAULT 'none',
                        done INTEGER NOT NULL DEFAULT 0,
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS map_stacks (
                        id TEXT NOT NULL PRIMARY KEY,
                        name TEXT NOT NULL,
                        color TEXT NOT NULL,
                        icon TEXT NOT NULL DEFAULT '',
                        createdAt INTEGER NOT NULL
                    )
                """.trimIndent())
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS map_pins (
                        id TEXT NOT NULL PRIMARY KEY,
                        stackId TEXT NOT NULL,
                        label TEXT NOT NULL,
                        lat REAL NOT NULL,
                        lng REAL NOT NULL,
                        url TEXT NOT NULL DEFAULT '',
                        note TEXT NOT NULL DEFAULT '',
                        priority TEXT NOT NULL DEFAULT 'none',
                        category TEXT NOT NULL DEFAULT '',
                        rating INTEGER NOT NULL DEFAULT 0,
                        reviewNote TEXT NOT NULL DEFAULT '',
                        createdAt INTEGER NOT NULL
                    )
                """.trimIndent())
            }
        }

        private val MIGRATION_7_8 = object : androidx.room.migration.Migration(7, 8) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE secrets ADD COLUMN url TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE secrets ADD COLUMN description TEXT NOT NULL DEFAULT ''")
            }
        }

        fun get(context: Context): AppDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(context, AppDatabase::class.java, "myspace.db")
                .addMigrations(
                    MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4,
                    MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7,
                    MIGRATION_7_8,
                )
                .build()
                .also { INSTANCE = it }
        }
    }
}
