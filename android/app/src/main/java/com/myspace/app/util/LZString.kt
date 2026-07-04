package com.myspace.app.util

/**
 * Pure-Kotlin port of lz-string's compressToEncodedURIComponent / decompressFromEncodedURIComponent.
 * Produces output compatible with the JavaScript library used in the Chrome extension.
 */
object LZString {

    private const val KEY_STR_URI_SAFE =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$"

    fun compressToEncodedURIComponent(input: String): String {
        if (input.isEmpty()) return ""
        val compressed = compress(input, 6) { a -> KEY_STR_URI_SAFE[a] }
        return compressed.replace("+", "%2B").replace("$", "%24")
    }

    fun decompressFromEncodedURIComponent(compressed: String): String {
        if (compressed.isEmpty()) return ""
        val fixed = compressed.replace(' ', '+').replace("%2B", "+").replace("%24", "$")
        return decompress(fixed.length, 32) { index -> KEY_STR_URI_SAFE.indexOf(fixed[index]) }
    }

    private fun compress(uncompressed: String, bitsPerChar: Int, getCharFrom: (Int) -> Char): String {
        var i: Int; var value: Int
        val context_dictionary = HashMap<String, Int>()
        val context_dictionaryToCreate = HashSet<String>()
        var context_c: String
        var context_wc: String
        var context_w = ""
        var context_enlargeIn = 2.0
        var context_dictSize = 3
        var context_numBits = 2
        val context_data = StringBuilder()
        var context_data_val = 0
        var context_data_position = 0

        fun produceW(w: String) {
            if (context_dictionaryToCreate.contains(w)) {
                if (w[0].code < 256) {
                    for (ii in 0 until context_numBits) {
                        context_data_val = (context_data_val shl 1)
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0
                            context_data.append(getCharFrom(context_data_val))
                            context_data_val = 0
                        } else context_data_position++
                    }
                    value = w[0].code
                    for (ii in 0 until 8) {
                        context_data_val = (context_data_val shl 1) or (value and 1)
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0
                            context_data.append(getCharFrom(context_data_val))
                            context_data_val = 0
                        } else context_data_position++
                        value = value shr 1
                    }
                } else {
                    value = 1
                    for (ii in 0 until context_numBits) {
                        context_data_val = (context_data_val shl 1) or value
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0
                            context_data.append(getCharFrom(context_data_val))
                            context_data_val = 0
                        } else context_data_position++
                        value = 0
                    }
                    value = w[0].code
                    for (ii in 0 until 16) {
                        context_data_val = (context_data_val shl 1) or (value and 1)
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0
                            context_data.append(getCharFrom(context_data_val))
                            context_data_val = 0
                        } else context_data_position++
                        value = value shr 1
                    }
                }
                context_enlargeIn--
                if (context_enlargeIn == 0.0) {
                    context_enlargeIn = Math.pow(2.0, context_numBits.toDouble())
                    context_numBits++
                }
                context_dictionaryToCreate.remove(w)
            } else {
                value = context_dictionary[w]!!
                for (ii in 0 until context_numBits) {
                    context_data_val = (context_data_val shl 1) or (value and 1)
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0
                        context_data.append(getCharFrom(context_data_val))
                        context_data_val = 0
                    } else context_data_position++
                    value = value shr 1
                }
            }
            context_enlargeIn--
            if (context_enlargeIn == 0.0) {
                context_enlargeIn = Math.pow(2.0, context_numBits.toDouble())
                context_numBits++
            }
        }

        for (ii in uncompressed.indices) {
            context_c = uncompressed[ii].toString()
            if (!context_dictionary.containsKey(context_c)) {
                context_dictionary[context_c] = context_dictSize++
                context_dictionaryToCreate.add(context_c)
            }
            context_wc = context_w + context_c
            if (context_dictionary.containsKey(context_wc)) {
                context_w = context_wc
            } else {
                produceW(context_w)
                context_dictionary[context_wc] = context_dictSize++
                context_w = context_c
            }
        }
        if (context_w.isNotEmpty()) produceW(context_w)

        // End marker
        value = 2
        for (ii in 0 until context_numBits) {
            context_data_val = (context_data_val shl 1) or (value and 1)
            if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0
                context_data.append(getCharFrom(context_data_val))
                context_data_val = 0
            } else context_data_position++
            value = value shr 1
        }
        while (true) {
            context_data_val = context_data_val shl 1
            if (context_data_position == bitsPerChar - 1) {
                context_data.append(getCharFrom(context_data_val))
                break
            } else context_data_position++
        }
        return context_data.toString()
    }

    private fun decompress(length: Int, resetValue: Int, getNextValue: (Int) -> Int): String {
        // Mirror the JS _decompress implementation exactly
        val dictionary = ArrayList<Any?>() // stores Int (0,1,2) or String
        var next: Int
        var enlargeIn = 4
        var dictSize = 4
        var numBits = 3
        var entry: String
        val result = StringBuilder()
        var bits: Int
        var maxpower: Int
        var power: Int
        var c: Int // holds integer index, like JS

        var dataVal = getNextValue(0)
        var dataPosition = resetValue
        var dataIndex = 1

        fun readBits(n: Int): Int {
            var res = 0
            maxpower = Math.pow(2.0, n.toDouble()).toInt()
            power = 1
            while (power != maxpower) {
                bits = dataVal and dataPosition
                dataPosition = dataPosition shr 1
                if (dataPosition == 0) {
                    dataPosition = resetValue
                    dataVal = getNextValue(dataIndex++)
                }
                res = res or (if (bits > 0) 1 else 0) * power
                power = power shl 1
            }
            return res
        }

        // Initialize dictionary with 0, 1, 2 as integers (matching JS: dictionary[i] = i)
        for (k in 0..2) dictionary.add(k)

        // Read first symbol
        next = readBits(2)
        val firstChar: String = when (next) {
            0 -> Char(readBits(8)).toString()
            1 -> Char(readBits(16)).toString()
            2 -> return ""
            else -> return ""
        }
        dictionary.add(firstChar) // dictionary[3] = firstChar
        result.append(firstChar)
        var w = firstChar

        while (true) {
            if (dataIndex > length) return ""

            c = readBits(numBits)

            when (c) {
                0 -> {
                    // New literal 8-bit char
                    dictionary.add(Char(readBits(8)).toString())
                    dictSize++
                    c = dictSize - 1
                    enlargeIn--
                }
                1 -> {
                    // New literal 16-bit char
                    dictionary.add(Char(readBits(16)).toString())
                    dictSize++
                    c = dictSize - 1
                    enlargeIn--
                }
                2 -> return result.toString()
            }

            if (enlargeIn == 0) {
                enlargeIn = Math.pow(2.0, numBits.toDouble()).toInt()
                numBits++
            }

            // entry = dictionary[c] if it exists, else if c == dictSize then w + w[0]
            val dictEntry = dictionary.getOrNull(c)
            entry = when {
                dictEntry is String -> dictEntry
                dictEntry != null && dictEntry !is String -> {
                    // This shouldn't happen after index 3, but handle gracefully
                    dictEntry.toString()
                }
                c == dictSize -> "$w${w[0]}"
                else -> return ""
            }
            result.append(entry)

            // Add w + entry[0] to dictionary
            dictionary.add("$w${entry[0]}")
            dictSize++
            enlargeIn--

            if (enlargeIn == 0) {
                enlargeIn = Math.pow(2.0, numBits.toDouble()).toInt()
                numBits++
            }

            w = entry
        }
    }
}
