package com.myspace.app

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.myspace.app.data.*
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppDatabaseTest {

    private lateinit var db: AppDatabase

    @Before fun setup() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).allowMainThreadQueries().build()
    }

    @After fun teardown() { db.close() }

    @Test fun noteUpsertAndDelete() = runBlocking {
        val note = NoteEntity("n1", "Hello", "World", "[]", "", 0L, 0L)
        db.noteDao().upsert(note)
        assertEquals(1, db.noteDao().getAll().size)
        db.noteDao().delete("n1")
        assertEquals(0, db.noteDao().getAll().size)
    }

    @Test fun noteSearch() = runBlocking {
        db.noteDao().upsert(NoteEntity("n1", "Meeting notes", "Agenda here", "[]", "", 0L, 0L))
        db.noteDao().upsert(NoteEntity("n2", "Shopping list", "Milk, eggs", "[]", "", 0L, 1L))
        assertEquals(1, db.noteDao().search("Meeting").size)
        assertEquals(0, db.noteDao().search("xyz").size)
    }

    @Test fun secretUpsertAndGetMeta() = runBlocking {
        val secret = SecretEntity("s1", "GitHub Token", "ct", "iv", """["work"]""", "https://github.com", "desc", 0L, 0L)
        db.secretDao().upsert(secret)
        val meta = db.secretDao().getMeta()
        assertEquals(1, meta.size)
        assertEquals("GitHub Token", meta[0].label)
    }

    @Test fun secretSearchMeta() = runBlocking {
        db.secretDao().upsert(SecretEntity("s1", "GitHub Token", "ct", "iv", "[]", "", "", 0L, 0L))
        db.secretDao().upsert(SecretEntity("s2", "Stripe Key", "ct2", "iv2", "[]", "", "", 0L, 1L))
        assertEquals(1, db.secretDao().searchMeta("GitHub").size)
        assertEquals(0, db.secretDao().searchMeta("Notion").size)
    }

    @Test fun secretGetMetaByTag() = runBlocking {
        db.secretDao().upsert(SecretEntity("s1", "Key", "ct", "iv", """["work"]""", "", "", 0L, 0L))
        db.secretDao().upsert(SecretEntity("s2", "Other", "ct2", "iv2", """["personal"]""", "", "", 0L, 1L))
        assertEquals(1, db.secretDao().getMetaByTag("\"work\"").size)
        assertEquals(0, db.secretDao().getMetaByTag("\"finance\"").size)
    }

    @Test fun mapPinCrudAndDeleteForStack() = runBlocking {
        db.mapStackDao().upsert(MapStackEntity("st1", "Tokyo", "#818CF8", "pin", 0L))
        db.mapPinDao().upsert(MapPinEntity("p1", "st1", "Shibuya", 35.659, 139.700, "", "", "none", "", 0, "", 0L))
        db.mapPinDao().upsert(MapPinEntity("p2", "st1", "Shinjuku", 35.689, 139.692, "", "", "none", "", 0, "", 1L))
        assertEquals(2, db.mapPinDao().getForStack("st1").size)
        db.mapPinDao().deleteForStack("st1")
        assertEquals(0, db.mapPinDao().getForStack("st1").size)
    }

    @Test fun todoTaskCrudAndDeleteForList() = runBlocking {
        db.todoListDao().upsert(TodoListEntity("l1", "Work", "#38BDF8", "", 0L))
        db.todoTaskDao().upsert(TodoTaskEntity("t1", "l1", "Write tests", "", "high", null, "none", false, 0L, 0L))
        assertEquals(1, db.todoTaskDao().getForList("l1").size)
        db.todoTaskDao().deleteForList("l1")
        assertEquals(0, db.todoTaskDao().getForList("l1").size)
    }
}
