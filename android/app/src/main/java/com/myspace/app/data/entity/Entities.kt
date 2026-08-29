package com.myspace.app.data.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

// ---- Notes ----

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey val id: String,
    val title: String,
    val content: String,
    val tags: String,          // JSON array: ["tag1","tag2"]
    @ColumnInfo(name = "image_data") val imageData: String,  // JSON array of base64 data URLs
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis()
)

// ---- Secrets ----

@Entity(tableName = "secrets")
data class SecretEntity(
    @PrimaryKey val id: String,
    val label: String,
    val ciphertext: String,
    val iv: String,
    val tags: String,          // JSON array
    val url: String = "",
    val description: String = "",
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis()
)

// ---- Subscriptions ----

@Entity(tableName = "subscriptions")
data class SubscriptionEntity(
    @PrimaryKey val id: String,
    val name: String,
    val amount: Double,
    val currency: String = "USD",
    val cycle: String = "monthly",   // monthly | yearly | weekly | quarterly
    @ColumnInfo(name = "start_date") val startDate: String,
    val tags: String = "[]",
    val notes: String = "",
    val active: Boolean = true,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis()
)

// ---- Bills (actual monthly amounts, overriding subscription amount) ----

@Entity(
    tableName = "bills",
    primaryKeys = ["sub_id", "year", "month"],
    foreignKeys = [ForeignKey(
        entity = SubscriptionEntity::class,
        parentColumns = ["id"],
        childColumns = ["sub_id"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("sub_id")]
)
data class BillEntity(
    @ColumnInfo(name = "sub_id") val subId: String,
    val year: Int,
    val month: Int,           // 1–12
    val amount: Double,
    val currency: String = "USD",
    val notes: String = "",
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis()
)

// ---- Todo Lists ----

@Entity(tableName = "todo_lists")
data class TodoListEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String,
    val icon: String = "",
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)

// ---- Todo Tasks ----

@Entity(
    tableName = "todo_tasks",
    foreignKeys = [ForeignKey(
        entity = TodoListEntity::class,
        parentColumns = ["id"],
        childColumns = ["list_id"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("list_id")]
)
data class TodoTaskEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "list_id") val listId: String,
    val title: String,
    val note: String = "",
    val priority: String = "low",       // low | medium | high
    @ColumnInfo(name = "due_date") val dueDate: Long? = null,
    val recurrence: String = "none",    // none | daily | weekly | monthly
    val done: Boolean = false,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis()
)

// ---- Map Stacks ----

@Entity(tableName = "map_stacks")
data class MapStackEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String,
    val icon: String = "",
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)

// ---- Map Pins ----

@Entity(
    tableName = "map_pins",
    foreignKeys = [ForeignKey(
        entity = MapStackEntity::class,
        parentColumns = ["id"],
        childColumns = ["stack_id"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("stack_id")]
)
data class MapPinEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "stack_id") val stackId: String,
    val label: String,
    val lat: Double,
    val lng: Double,
    val url: String = "",
    val note: String = "",
    val priority: String = "none",    // none | low | medium | high
    val category: String = "",
    val rating: Int = 0,              // 0–5
    @ColumnInfo(name = "review_note") val reviewNote: String = "",
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)
