package com.myspace.app

import com.myspace.app.util.TagUtils
import org.junit.Assert.*
import org.junit.Test

class TagUtilsTest {

    @Test fun `parseTags empty string returns empty list`() {
        assertEquals(emptyList<String>(), TagUtils.parseTags(""))
    }

    @Test fun `parseTags empty array returns empty list`() {
        assertEquals(emptyList<String>(), TagUtils.parseTags("[]"))
    }

    @Test fun `parseTags single tag`() {
        assertEquals(listOf("work"), TagUtils.parseTags("""["work"]"""))
    }

    @Test fun `parseTags multiple tags`() {
        assertEquals(listOf("work", "home", "finance"), TagUtils.parseTags("""["work","home","finance"]"""))
    }

    @Test fun `parseTags trims whitespace in values`() {
        val result = TagUtils.parseTags("""["work", "home"]""")
        assertEquals(listOf("work", "home"), result)
    }

    @Test fun `matchesTag returns true when tag present`() {
        assertTrue(TagUtils.matchesTag("""["work","home"]""", "work"))
    }

    @Test fun `matchesTag returns false when tag absent`() {
        assertFalse(TagUtils.matchesTag("""["work","home"]""", "finance"))
    }

    @Test fun `matchesTag returns false for empty tags`() {
        assertFalse(TagUtils.matchesTag("[]", "work"))
    }
}
