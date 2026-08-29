package com.myspace.app.viewmodel

import app.cash.turbine.test
import com.myspace.app.data.dao.NoteDao
import com.myspace.app.data.entity.NoteEntity
import com.myspace.app.ui.viewmodel.NotesViewModel
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NotesViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private val dao: NoteDao = mockk(relaxed = true)
    private lateinit var vm: NotesViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        every { dao.observeAll() } returns flowOf(emptyList())
        vm = NotesViewModel(dao)
    }

    @After
    fun teardown() {
        Dispatchers.resetMain()
    }

    // ── notes flow ────────────────────────────────────────────────────────────

    @Test
    fun `notes flow starts with empty list`() = runTest {
        vm.notes.test {
            assertEquals(emptyList<NoteEntity>(), awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `notes flow emits dao values`() = runTest {
        val notes = listOf(
            NoteEntity("1", "Hello", "World", "[]", "", 0, 0),
            NoteEntity("2", "Foo", "Bar", "[]", "", 0, 0)
        )
        every { dao.observeAll() } returns flowOf(notes)
        val freshVm = NotesViewModel(dao)

        freshVm.notes.test {
            val result = awaitItem()
            assertEquals(2, result.size)
            assertEquals("Hello", result[0].title)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `search calls dao search with trimmed query`() = runTest {
        coEvery { dao.search(any()) } returns emptyList()

        vm.search("kotlin")
        advanceTimeBy(300) // past 200ms debounce

        coVerify { dao.search("kotlin") }
    }

    // ── save ──────────────────────────────────────────────────────────────────

    @Test
    fun `save creates new entity with random id when noteId is null`() = runTest {
        coEvery { dao.upsert(any()) } just Runs

        vm.save(null, "Title", "Content", emptyList(), "[]")
        advanceUntilIdle()

        coVerify {
            dao.upsert(match { it.title == "Title" && it.content == "Content" && it.id.isNotBlank() })
        }
    }

    @Test
    fun `save reuses existing id when noteId is provided`() = runTest {
        coEvery { dao.upsert(any()) } just Runs

        vm.save("existing-id", "Updated", "New content", emptyList(), "[]")
        advanceUntilIdle()

        coVerify { dao.upsert(match { it.id == "existing-id" }) }
    }

    @Test
    fun `save uses Untitled when title is blank`() = runTest {
        coEvery { dao.upsert(any()) } just Runs

        vm.save(null, "   ", "Some content", emptyList(), "[]")
        advanceUntilIdle()

        coVerify { dao.upsert(match { it.title == "Untitled" }) }
    }

    @Test
    fun `save serialises tags to JSON array`() = runTest {
        coEvery { dao.upsert(any()) } just Runs

        vm.save(null, "T", "C", listOf("kotlin", "android"), "[]")
        advanceUntilIdle()

        coVerify { dao.upsert(match { it.tags == """["kotlin","android"]""" }) }
    }

    @Test
    fun `save escapes double quotes inside tag names`() = runTest {
        coEvery { dao.upsert(any()) } just Runs

        vm.save(null, "T", "C", listOf("""say "hello""""), "[]")
        advanceUntilIdle()

        coVerify { dao.upsert(match { it.tags.contains("""say \"hello\"""") }) }
    }

    @Test
    fun `save with empty tags produces empty JSON array`() = runTest {
        coEvery { dao.upsert(any()) } just Runs

        vm.save(null, "T", "C", emptyList(), "[]")
        advanceUntilIdle()

        coVerify { dao.upsert(match { it.tags == "[]" }) }
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    fun `delete calls dao deleteById`() = runTest {
        coEvery { dao.deleteById(any()) } just Runs

        vm.delete("abc-123")
        advanceUntilIdle()

        coVerify { dao.deleteById("abc-123") }
    }

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    fun `getById emits the dao result`() = runTest {
        val note = NoteEntity("99", "My Note", "Body", "[]", "", 0, 0)
        coEvery { dao.getById("99") } returns note

        vm.getById("99").test {
            assertEquals(note, awaitItem())
            awaitComplete()
        }
    }

    @Test
    fun `getById emits null when note not found`() = runTest {
        coEvery { dao.getById("missing") } returns null

        vm.getById("missing").test {
            assertNull(awaitItem())
            awaitComplete()
        }
    }
}
