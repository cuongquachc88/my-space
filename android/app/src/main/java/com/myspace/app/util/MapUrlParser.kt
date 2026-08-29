package com.myspace.app.util

import java.net.URLDecoder

/**
 * Mirrors extension mapExtractor.ts — parses lat/lng from Google Maps, OSM, Bing, Apple Maps URLs.
 */
object MapUrlParser {

    fun parse(url: String): Pair<Double, Double>? =
        tryGoogle(url) ?: tryOsm(url) ?: tryBing(url) ?: tryApple(url)

    // google.com/maps/@lat,lng or ?q=lat,lng or /place/.../@lat,lng
    private fun tryGoogle(url: String): Pair<Double, Double>? {
        if (!url.contains("google.com/maps") && !url.contains("maps.google")) return null
        val atRegex = Regex("""/@(-?\d+\.?\d*),(-?\d+\.?\d*)""")
        atRegex.find(url)?.let {
            return Pair(it.groupValues[1].toDouble(), it.groupValues[2].toDouble())
        }
        val qRegex = Regex("""[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)""")
        qRegex.find(url)?.let {
            return Pair(it.groupValues[1].toDouble(), it.groupValues[2].toDouble())
        }
        return null
    }

    // openstreetmap.org/#map=zoom/lat/lng or ?mlat=lat&mlon=lng
    private fun tryOsm(url: String): Pair<Double, Double>? {
        if (!url.contains("openstreetmap.org")) return null
        val hashRegex = Regex("""#map=\d+/(-?\d+\.?\d*)/(-?\d+\.?\d*)""")
        hashRegex.find(url)?.let {
            return Pair(it.groupValues[1].toDouble(), it.groupValues[2].toDouble())
        }
        val mlat = Regex("""mlat=(-?\d+\.?\d*)""").find(url)?.groupValues?.get(1)?.toDoubleOrNull()
        val mlon = Regex("""mlon=(-?\d+\.?\d*)""").find(url)?.groupValues?.get(1)?.toDoubleOrNull()
        if (mlat != null && mlon != null) return Pair(mlat, mlon)
        return null
    }

    // bing.com/maps?cp=lat~lng
    private fun tryBing(url: String): Pair<Double, Double>? {
        if (!url.contains("bing.com/maps")) return null
        val cpRegex = Regex("""cp=(-?\d+\.?\d*)~(-?\d+\.?\d*)""")
        cpRegex.find(url)?.let {
            return Pair(it.groupValues[1].toDouble(), it.groupValues[2].toDouble())
        }
        return null
    }

    // maps.apple.com/?ll=lat,lng or ?q=label&ll=lat,lng
    private fun tryApple(url: String): Pair<Double, Double>? {
        if (!url.contains("maps.apple.com")) return null
        val llRegex = Regex("""ll=(-?\d+\.?\d*),(-?\d+\.?\d*)""")
        llRegex.find(url)?.let {
            return Pair(it.groupValues[1].toDouble(), it.groupValues[2].toDouble())
        }
        return null
    }
}
