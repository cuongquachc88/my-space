package com.myspace.app.util

import org.junit.Assert.*
import org.junit.Test

class MapUrlParserTest {

    // ── Google Maps ───────────────────────────────────────────────────────────

    @Test
    fun `google maps at-sign format`() {
        val url = "https://www.google.com/maps/@10.7769,106.7009,15z"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(10.7769, result!!.first, 0.0001)
        assertEquals(106.7009, result.second, 0.0001)
    }

    @Test
    fun `google maps q param format`() {
        val url = "https://www.google.com/maps?q=48.8566,2.3522"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(48.8566, result!!.first, 0.0001)
        assertEquals(2.3522, result.second, 0.0001)
    }

    @Test
    fun `google maps place at-sign format`() {
        val url = "https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(48.8584, result!!.first, 0.0001)
        assertEquals(2.2945, result.second, 0.0001)
    }

    @Test
    fun `maps google shorthand domain`() {
        val url = "https://maps.google.com/maps/@-33.8688,151.2093,13z"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(-33.8688, result!!.first, 0.0001)
        assertEquals(151.2093, result.second, 0.0001)
    }

    @Test
    fun `negative coordinates handled`() {
        val url = "https://www.google.com/maps/@-34.6037,-58.3816,12z"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(-34.6037, result!!.first, 0.0001)
        assertEquals(-58.3816, result.second, 0.0001)
    }

    // ── OpenStreetMap ─────────────────────────────────────────────────────────

    @Test
    fun `osm hash map format`() {
        val url = "https://www.openstreetmap.org/#map=15/51.5074/-0.1278"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(51.5074, result!!.first, 0.0001)
        assertEquals(-0.1278, result.second, 0.0001)
    }

    @Test
    fun `osm mlat mlon query params`() {
        val url = "https://www.openstreetmap.org/?mlat=48.8566&mlon=2.3522"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(48.8566, result!!.first, 0.0001)
        assertEquals(2.3522, result.second, 0.0001)
    }

    // ── Bing Maps ────────────────────────────────────────────────────────────

    @Test
    fun `bing maps cp tilde format`() {
        val url = "https://www.bing.com/maps?cp=35.6762~139.6503&lvl=12"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(35.6762, result!!.first, 0.0001)
        assertEquals(139.6503, result.second, 0.0001)
    }

    // ── Apple Maps ────────────────────────────────────────────────────────────

    @Test
    fun `apple maps ll format`() {
        val url = "https://maps.apple.com/?ll=37.7749,-122.4194"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(37.7749, result!!.first, 0.0001)
        assertEquals(-122.4194, result.second, 0.0001)
    }

    @Test
    fun `apple maps with label and ll`() {
        val url = "https://maps.apple.com/?q=Golden+Gate+Bridge&ll=37.8199,-122.4783"
        val result = MapUrlParser.parse(url)
        assertNotNull(result)
        assertEquals(37.8199, result!!.first, 0.0001)
        assertEquals(-122.4783, result.second, 0.0001)
    }

    // ── Non-map URLs ──────────────────────────────────────────────────────────

    @Test
    fun `unrelated url returns null`() {
        assertNull(MapUrlParser.parse("https://example.com"))
    }

    @Test
    fun `empty string returns null`() {
        assertNull(MapUrlParser.parse(""))
    }

    @Test
    fun `google url without coordinates returns null`() {
        assertNull(MapUrlParser.parse("https://www.google.com/maps/search/coffee+shops/"))
    }
}
