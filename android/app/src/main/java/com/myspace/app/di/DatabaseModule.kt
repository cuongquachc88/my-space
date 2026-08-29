package com.myspace.app.di

import android.content.Context
import androidx.room.Room
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): AppDatabase =
        Room.databaseBuilder(ctx, AppDatabase::class.java, "myspace.db").build()

    @Provides fun provideNoteDao(db: AppDatabase) = db.noteDao()
    @Provides fun provideSecretDao(db: AppDatabase) = db.secretDao()
    @Provides fun provideSubscriptionDao(db: AppDatabase) = db.subscriptionDao()
    @Provides fun provideBillDao(db: AppDatabase) = db.billDao()
    @Provides fun provideTodoListDao(db: AppDatabase) = db.todoListDao()
    @Provides fun provideTodoTaskDao(db: AppDatabase) = db.todoTaskDao()
    @Provides fun provideMapStackDao(db: AppDatabase) = db.mapStackDao()
    @Provides fun provideMapPinDao(db: AppDatabase) = db.mapPinDao()
}
