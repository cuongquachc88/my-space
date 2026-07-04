package com.myspace.app

import com.myspace.app.util.LZString
import org.junit.Assert.*
import org.junit.Test

class LZStringTest {

    @Test fun `round-trip simple string`() {
        val input = """{"name":"Paris Trip","color":"#FB923C","pins":[]}"""
        val compressed = LZString.compressToEncodedURIComponent(input)
        val decompressed = LZString.decompressFromEncodedURIComponent(compressed)
        assertEquals(input, decompressed)
    }

    @Test fun `round-trip with pin data`() {
        val input = """{"name":"Tokyo","color":"#818CF8","pins":[{"label":"Shibuya","lat":35.65910,"lng":139.70066,"note":"crossing","url":""}]}"""
        assertEquals(input, LZString.decompressFromEncodedURIComponent(
            LZString.compressToEncodedURIComponent(input)
        ))
    }

    @Test fun `compressed output contains no raw plus or equals (URI-safe)`() {
        val compressed = LZString.compressToEncodedURIComponent("Hello world test string 12345")
        assertFalse(compressed.contains('+'))
        assertFalse(compressed.contains('='))
        assertFalse(compressed.contains('/'))
    }

    @Test fun `empty string round-trips`() {
        val compressed = LZString.compressToEncodedURIComponent("")
        assertEquals("", LZString.decompressFromEncodedURIComponent(compressed))
    }

    @Test fun `unicode content round-trips`() {
        val input = """{"name":"Café de Flore","pins":[{"label":"日本橋","lat":35.6,"lng":139.7}]}"""
        assertEquals(input, LZString.decompressFromEncodedURIComponent(
            LZString.compressToEncodedURIComponent(input)
        ))
    }
}
