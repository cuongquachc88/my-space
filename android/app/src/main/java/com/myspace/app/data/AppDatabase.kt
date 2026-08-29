package com.myspace.app.data

import androidx.room.Database
import androidx.room.RoomDatabase
import com.myspace.app.data.dao.*
import com.myspace.app.data.entity.*

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
    version = 1,
    exportSchema = false
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
}
