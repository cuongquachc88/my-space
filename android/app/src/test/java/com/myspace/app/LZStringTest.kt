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

    @Test fun `compressed output has no raw dollar or plus for long repetitive string`() {
        // Long repetitive input is likely to exercise index-62 (+) and index-63 ($) alphabet chars
        val input = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(10)
        val compressed = LZString.compressToEncodedURIComponent(input)
        assertFalse("Raw + must not appear in output", compressed.contains('+'))
        assertFalse("Raw $ must not appear in output", compressed.contains('$'))
        // Round-trip must still work
        assertEquals(input, LZString.decompressFromEncodedURIComponent(compressed))
    }

    @Test fun `decompressFromEncodedURIComponent handles percent-encoded input`() {
        // Compress, then manually replace %2B with + and %24 with $ to simulate a URL-decoded value
        // where percent-encoding was preserved literally — decompressor must handle both forms
        val input = "test string for cross-platform compatibility check"
        val percentEncoded = LZString.compressToEncodedURIComponent(input)
        // decompressFromEncodedURIComponent should handle the percent-encoded form directly
        assertEquals(input, LZString.decompressFromEncodedURIComponent(percentEncoded))
        // Also verify it handles the decoded form (where %2B -> + and %24 -> $)
        val decoded = percentEncoded.replace("%2B", "+").replace("%24", "$")
        assertEquals(input, LZString.decompressFromEncodedURIComponent(decoded))
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
