package com.myspace.app.util

object TagUtils {
    fun parseTags(json: String): List<String> {
        if (json.isBlank() || json == "[]") return emptyList()
        return json
            .trim('[', ']')
            .split(",")
            .map { it.trim().trim('"') }
            .filter { it.isNotEmpty() }
    }

    fun matchesTag(tagsJson: String, tag: String): Boolean =
        parseTags(tagsJson).contains(tag)
}
