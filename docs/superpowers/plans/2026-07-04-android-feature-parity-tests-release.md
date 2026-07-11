{% raw %}
# Android Feature Parity, Tests & Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Android/Chrome-extension feature gap (Vault search, Map Pin enhancements, Settings screen), add a full unit-test suite, and wire up a signed-AAB CI/CD pipeline for the Play Store.

**Architecture:** All feature additions follow the existing pattern — stateful `@Composable` screens reading directly from `AppDatabase` via Room DAOs, no ViewModel layer. New utility classes (`LZString`, tag helpers) are pure Kotlin objects with no Android dependencies, making them easily testable with JUnit4. The CI pipeline runs unit tests → instrumented tests → release build in sequence, gated so a build only signs if all tests pass.

**Tech Stack:** Kotlin 2.0, Jetpack Compose + Material3, Room 2.6, Android Keystore AES-GCM, JUnit4, `androidx.biometric`, GitHub Actions, Gradle 8.5.

## Global Constraints

- Min SDK: 26 (Android 8.0). Max tested SDK: 35.
- Kotlin JVM target: 17. Java source/target compatibility: 17.
- All new `@Composable` screens receive `AppDatabase` directly (no ViewModel) — match existing screen signatures.
- All new theme colors come from `com.myspace.app.ui.theme.Theme.kt` constants — never inline hex in screens.
- No new external dependencies unless explicitly listed in the task.
- No `FlowRow` — use `LazyRow` for horizontal chip lists (avoids `@ExperimentalLayoutApi`).
- `generatePassword` signature: `fun generatePassword(length: Int, upper: Boolean, digits: Boolean, symbols: Boolean): String` — defined in `GeneratorScreen.kt`, package `com.myspace.app.ui.screens`.
- `CryptoManager.encrypt(plaintext: String): Pair<String, String>` returns `(ciphertext, iv)` both Base64-NO_WRAP strings.
- `CryptoManager.decrypt(ciphertext: String, iv: String): String`.
- Commit messages: no `Co-Authored-By` trailer.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `android/app/src/main/java/com/myspace/app/data/AppDatabase.kt` | Modify | Add 2 `SecretDao` search query methods |
| `android/app/src/main/java/com/myspace/app/util/TagUtils.kt` | **Create** | Pure tag-parsing helpers (split JSON tag array from SecretMeta) |
| `android/app/src/main/java/com/myspace/app/util/LZString.kt` | **Create** | Pure Kotlin LZString `compressToEncodedURIComponent` + `decompressFromEncodedURIComponent` |
| `android/app/src/main/java/com/myspace/app/ui/screens/VaultScreen.kt` | Modify | Add search bar + tag filter LazyRow |
| `android/app/src/main/java/com/myspace/app/ui/screens/MapPinsScreen.kt` | Modify | Add star rating, review note, share button, icon picker integration |
| `android/app/src/main/java/com/myspace/app/ui/components/PinIconPicker.kt` | **Create** | 8-icon grid picker composable + Canvas icon renderers |
| `android/app/src/main/java/com/myspace/app/ui/screens/SettingsScreen.kt` | **Create** | Auto-lock, biometric toggle, lock-now, about |
| `android/app/src/main/java/com/myspace/app/ui/MySpaceApp.kt` | Modify | Add `Screen.Settings`, session-lock state, idle auto-lock |
| `android/app/src/main/java/com/myspace/app/MainActivity.kt` | Modify | Wire biometric prompt on app resume when setting enabled |
| `android/app/src/test/java/com/myspace/app/GeneratorTest.kt` | **Create** | JVM tests for `generatePassword` |
| `android/app/src/test/java/com/myspace/app/TagUtilsTest.kt` | **Create** | JVM tests for tag-parsing helpers |
| `android/app/src/test/java/com/myspace/app/LZStringTest.kt` | **Create** | JVM tests for LZString round-trip |
| `android/app/src/androidTest/java/com/myspace/app/AppDatabaseTest.kt` | **Create** | Instrumented Room CRUD + migration tests |
| `android/app/src/androidTest/java/com/myspace/app/CryptoManagerTest.kt` | **Create** | Instrumented encrypt/decrypt tests |
| `android/app/build.gradle.kts` | Modify | Add test deps + signing config block |
| `android/gradle/libs.versions.toml` | Modify | Add `room-testing` library entry |
| `android/run-emulator.sh` | Modify | Add `--unit` and `--test` flags |
| `android/build-release.sh` | **Create** | Signing script reading env vars |
| `.github/workflows/android-release.yml` | **Create** | CI: unit → instrumented → signed AAB |
| `.gitignore` | Modify | Block `keystore.properties` and `android/output/*.aab` |

---

### Task 1: Pure utilities — TagUtils and LZString

**Files:**
- Create: `android/app/src/main/java/com/myspace/app/util/TagUtils.kt`
- Create: `android/app/src/main/java/com/myspace/app/util/LZString.kt`
- Create: `android/app/src/test/java/com/myspace/app/TagUtilsTest.kt`
- Create: `android/app/src/test/java/com/myspace/app/LZStringTest.kt`

**Interfaces:**
- Produces:
  - `TagUtils.parseTags(json: String): List<String>` — splits `["work","home"]` → `["work","home"]`
  - `TagUtils.matchesTag(tagsJson: String, tag: String): Boolean`
  - `LZString.compressToEncodedURIComponent(input: String): String`
  - `LZString.decompressFromEncodedURIComponent(compressed: String): String`

- [ ] **Step 1: Write TagUtils tests**

Create `android/app/src/test/java/com/myspace/app/TagUtilsTest.kt`:

```kotlin
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
```

- [ ] **Step 2: Run test — expect FAIL (class not found)**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew test --tests "com.myspace.app.TagUtilsTest" 2>&1 | tail -20
```

Expected: compilation error `Unresolved reference: TagUtils`

- [ ] **Step 3: Implement TagUtils**

Create `android/app/src/main/java/com/myspace/app/util/TagUtils.kt`:

```kotlin
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
```

- [ ] **Step 4: Run TagUtils tests — expect PASS**

```bash
./gradlew test --tests "com.myspace.app.TagUtilsTest" 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL` — 8 tests passed.

- [ ] **Step 5: Write LZString tests**

Create `android/app/src/test/java/com/myspace/app/LZStringTest.kt`:

```kotlin
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
```

- [ ] **Step 6: Run LZString tests — expect FAIL**

```bash
./gradlew test --tests "com.myspace.app.LZStringTest" 2>&1 | tail -10
```

Expected: `Unresolved reference: LZString`

- [ ] **Step 7: Implement LZString**

Create `android/app/src/main/java/com/myspace/app/util/LZString.kt`:

```kotlin
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
        return compress(input, 6) { a -> KEY_STR_URI_SAFE[a] }
    }

    fun decompressFromEncodedURIComponent(compressed: String): String {
        if (compressed.isEmpty()) return ""
        val fixed = compressed.replace(' ', '+')
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
        val dictionary = ArrayList<String>()
        var next: Int
        var enlargeIn = 4
        var dictSize = 4
        var numBits = 3
        var entry: String
        val result = StringBuilder()
        var i: Int
        var bits: Int
        var maxpower: Int
        var power: Int
        var c: String
        val data_val = intArrayOf(getNextValue(0))
        val data_index = intArrayOf(1)
        val data_position = intArrayOf(resetValue)

        fun readBits(n: Int): Int {
            var res = 0
            maxpower = Math.pow(2.0, n.toDouble()).toInt()
            power = 1
            while (power != maxpower) {
                bits = data_val[0] and data_position[0]
                data_position[0] = data_position[0] shr 1
                if (data_position[0] == 0) {
                    data_position[0] = resetValue
                    data_val[0] = getNextValue(data_index[0]++)
                }
                res = res or (if (bits > 0) 1 else 0) * power
                power = power shl 1
            }
            return res
        }

        for (k in 0..2) dictionary.add(k.toString())

        next = readBits(2)
        when (next) {
            0 -> c = Char(readBits(8)).toString()
            1 -> c = Char(readBits(16)).toString()
            2 -> return ""
            else -> return ""
        }
        dictionary.add(c)
        result.append(c)
        var w = c

        while (true) {
            if (data_index[0] > length) return ""
            next = readBits(numBits)
            val nextCode = next
            c = when (next) {
                0 -> { Char(readBits(8)).toString().also { dictionary.add(it) } }
                1 -> { Char(readBits(16)).toString().also { dictionary.add(it) } }
                2 -> return result.toString()
                else -> {
                    if (next < dictionary.size) dictionary[next]
                    else if (next == dictSize) "$w${w[0]}"
                    else return ""
                }
            }
            result.append(c)
            entry = if (next > 2) {
                if (next < dictionary.size) dictionary[next]
                else if (next == dictSize) "$w${w[0]}"
                else return ""
            } else c
            dictionary.add("$w${entry[0]}")
            dictSize++
            enlargeIn--
            if (enlargeIn == 0) {
                enlargeIn = Math.pow(2.0, numBits.toDouble()).toInt()
                numBits++
            }
            w = c
        }
    }
}
```

- [ ] **Step 8: Run LZString tests — expect PASS**

```bash
./gradlew test --tests "com.myspace.app.LZStringTest" 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL` — 5 tests passed.

- [ ] **Step 9: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/main/java/com/myspace/app/util/TagUtils.kt \
        android/app/src/main/java/com/myspace/app/util/LZString.kt \
        android/app/src/test/java/com/myspace/app/TagUtilsTest.kt \
        android/app/src/test/java/com/myspace/app/LZStringTest.kt
git commit -m "feat: add TagUtils and LZString pure utilities with tests"
```

---

### Task 2: SecretDao search queries

**Files:**
- Modify: `android/app/src/main/java/com/myspace/app/data/AppDatabase.kt`

**Interfaces:**
- Consumes: `SecretMeta` data class (already defined in `AppDatabase.kt`)
- Produces:
  - `SecretDao.searchMeta(q: String): List<SecretMeta>` — label LIKE `%q%`
  - `SecretDao.getMetaByTag(tag: String): List<SecretMeta>` — tags INSTR match

- [ ] **Step 1: Add queries to SecretDao**

In `AppDatabase.kt`, inside the `SecretDao` interface, add after the existing `getMeta()` method:

```kotlin
@Query("SELECT id, label, tags, url, description, createdAt, updatedAt FROM secrets WHERE label LIKE '%' || :q || '%' ORDER BY updatedAt DESC")
suspend fun searchMeta(q: String): List<SecretMeta>

@Query("SELECT id, label, tags, url, description, createdAt, updatedAt FROM secrets WHERE INSTR(tags, :tag) > 0 ORDER BY updatedAt DESC")
suspend fun getMetaByTag(tag: String): List<SecretMeta>
```

- [ ] **Step 2: Verify compilation**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew compileDebugKotlin 2>&1 | tail -15
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/main/java/com/myspace/app/data/AppDatabase.kt
git commit -m "feat: add SecretDao search and tag-filter queries"
```

---

### Task 3: Vault search + tag filter UI

**Files:**
- Modify: `android/app/src/main/java/com/myspace/app/ui/screens/VaultScreen.kt`

**Interfaces:**
- Consumes: `db.secretDao().searchMeta(q)`, `db.secretDao().getMetaByTag(tag)`, `db.secretDao().getMeta()`, `TagUtils.parseTags(tags)`

- [ ] **Step 1: Add state and reload logic**

In `VaultScreen.kt`, inside `VaultScreen(db: AppDatabase)` composable, add state variables after the existing ones:

```kotlin
var query by remember { mutableStateOf("") }
var activeTag by remember { mutableStateOf<String?>(null) }
var allTags by remember { mutableStateOf<List<String>>(emptyList()) }
```

Replace the existing `reload()` lambda with:

```kotlin
fun reload() {
    scope.launch {
        val list = when {
            activeTag != null -> db.secretDao().getMetaByTag("\"$activeTag\"")
            query.isNotBlank() -> db.secretDao().searchMeta(query)
            else -> db.secretDao().getMeta()
        }
        secrets = list
        allTags = list
            .flatMap { TagUtils.parseTags(it.tags) }
            .distinct()
            .sorted()
    }
}
```

Add `import com.myspace.app.util.TagUtils` at the top of the file.

- [ ] **Step 2: Add search bar and tag filter chips before the secret list**

In the `Column` that wraps the secrets list (just before the `if (secrets.isEmpty())` block), add:

```kotlin
// Search bar
OutlinedTextField(
    value = query,
    onValueChange = { query = it; activeTag = null; reload() },
    placeholder = { Text("Search secrets…", fontSize = 13.sp, color = Color(0x55FFFFFF)) },
    singleLine = true,
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AccentVault.copy(alpha = 0.5f),
        unfocusedBorderColor = BgCardBorder,
        focusedContainerColor = BgCard,
        unfocusedContainerColor = BgCard,
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
    ),
    leadingIcon = {
        Icon(Icons.Default.Search, null, tint = Color(0x55FFFFFF), modifier = Modifier.size(18.dp))
    },
    textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
)

// Tag filter chips
if (allTags.isNotEmpty()) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        items(allTags) { tag ->
            FilterChip(
                selected = activeTag == tag,
                onClick = {
                    activeTag = if (activeTag == tag) null else tag
                    query = ""
                    reload()
                },
                label = { Text("#$tag", fontSize = 11.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AccentVault.copy(alpha = 0.2f),
                    selectedLabelColor = AccentVault,
                ),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = activeTag == tag,
                    selectedBorderColor = AccentVault.copy(0.5f),
                    borderColor = BgCardBorder,
                ),
            )
        }
    }
}
```

Add required imports:
```kotlin
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.OutlinedTextFieldDefaults
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew compileDebugKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/main/java/com/myspace/app/ui/screens/VaultScreen.kt
git commit -m "feat(vault): add search bar and tag filter chips"
```

---

### Task 4: PinIconPicker composable

**Files:**
- Create: `android/app/src/main/java/com/myspace/app/ui/components/PinIconPicker.kt`

**Interfaces:**
- Produces: `@Composable fun PinIconPicker(selected: String, onSelect: (String) -> Unit, accentColor: Color)`
- Produces: `@Composable fun PinIconCanvas(id: String, color: Color, size: Dp)`
- Icon ID strings: `"pin"`, `"hotel"`, `"cafe"`, `"restaurant"`, `"attraction"`, `"shopping"`, `"transport"`, `"hospital"`

- [ ] **Step 1: Create PinIconPicker.kt**

Create `android/app/src/main/java/com/myspace/app/ui/components/PinIconPicker.kt`:

```kotlin
package com.myspace.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.Canvas

val PIN_ICON_IDS = listOf("pin", "hotel", "cafe", "restaurant", "attraction", "shopping", "transport", "hospital")

@Composable
fun PinIconPicker(selected: String, onSelect: (String) -> Unit, accentColor: Color) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        PIN_ICON_IDS.forEach { id ->
            val isSelected = id == selected
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(accentColor.copy(alpha = if (isSelected) 0.25f else 0.08f))
                    .then(
                        if (isSelected) Modifier.border(1.5.dp, accentColor.copy(alpha = 0.8f), RoundedCornerShape(8.dp))
                        else Modifier
                    )
                    .clickable { onSelect(id) },
                contentAlignment = Alignment.Center,
            ) {
                PinIconCanvas(id = id, color = accentColor, size = 20.dp)
            }
        }
    }
}

@Composable
fun PinIconCanvas(id: String, color: Color, size: Dp) {
    Canvas(modifier = Modifier.size(size)) {
        when (id) {
            "pin" -> drawPin(color)
            "hotel" -> drawHotel(color)
            "cafe" -> drawCafe(color)
            "restaurant" -> drawRestaurant(color)
            "attraction" -> drawAttraction(color)
            "shopping" -> drawShopping(color)
            "transport" -> drawTransport(color)
            "hospital" -> drawHospital(color)
            else -> drawPin(color)
        }
    }
}

private fun DrawScope.drawPin(color: Color) {
    val r = size.width * 0.35f
    drawCircle(color = color.copy(alpha = 0.25f), radius = r, center = center.copy(y = size.height * 0.38f))
    drawCircle(color = color, radius = r, center = center.copy(y = size.height * 0.38f), style = Stroke(size.width * 0.1f))
    drawLine(color, start = center.copy(y = size.height * 0.73f), end = center.copy(y = size.height * 0.95f), strokeWidth = size.width * 0.12f)
}

private fun DrawScope.drawHotel(color: Color) {
    val w = size.width; val h = size.height
    drawRect(color = color.copy(alpha = 0.25f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.2f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.65f))
    drawRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.2f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.65f), style = Stroke(w * 0.09f))
    drawRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.38f, h * 0.6f), size = androidx.compose.ui.geometry.Size(w * 0.24f, h * 0.25f))
}

private fun DrawScope.drawCafe(color: Color) {
    val w = size.width; val h = size.height
    drawOval(color = color.copy(alpha = 0.25f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.3f), size = androidx.compose.ui.geometry.Size(w * 0.55f, h * 0.5f))
    drawOval(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.3f), size = androidx.compose.ui.geometry.Size(w * 0.55f, h * 0.5f), style = Stroke(w * 0.09f))
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.7f, h * 0.35f), end = androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.35f), strokeWidth = w * 0.09f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.72f, h * 0.55f), end = androidx.compose.ui.geometry.Offset(w * 0.83f, h * 0.55f), strokeWidth = w * 0.09f)
}

private fun DrawScope.drawRestaurant(color: Color) {
    val w = size.width; val h = size.height
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.3f, h * 0.1f), end = androidx.compose.ui.geometry.Offset(w * 0.3f, h * 0.9f), strokeWidth = w * 0.1f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.7f, h * 0.1f), end = androidx.compose.ui.geometry.Offset(w * 0.7f, h * 0.5f), strokeWidth = w * 0.1f)
    drawOval(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.1f), size = androidx.compose.ui.geometry.Size(w * 0.4f, h * 0.35f), style = Stroke(w * 0.09f))
}

private fun DrawScope.drawAttraction(color: Color) {
    val w = size.width; val h = size.height
    drawCircle(color = color.copy(alpha = 0.2f), radius = w * 0.42f)
    drawCircle(color = color, radius = w * 0.42f, style = Stroke(w * 0.09f))
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.08f), end = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.92f), strokeWidth = w * 0.08f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.08f, h * 0.5f), end = androidx.compose.ui.geometry.Offset(w * 0.92f, h * 0.5f), strokeWidth = w * 0.08f)
}

private fun DrawScope.drawShopping(color: Color) {
    val w = size.width; val h = size.height
    drawRect(color = color.copy(alpha = 0.25f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.35f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.55f))
    drawRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.35f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.55f), style = Stroke(w * 0.09f))
    drawArc(color = color, startAngle = 200f, sweepAngle = 140f, useCenter = false,
        topLeft = androidx.compose.ui.geometry.Offset(w * 0.28f, h * 0.08f),
        size = androidx.compose.ui.geometry.Size(w * 0.44f, h * 0.44f),
        style = Stroke(w * 0.1f))
}

private fun DrawScope.drawTransport(color: Color) {
    val w = size.width; val h = size.height
    drawRoundRect(color = color.copy(alpha = 0.2f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.15f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.6f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.15f))
    drawRoundRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.15f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.6f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.15f), style = Stroke(w * 0.09f))
    drawCircle(color = color, radius = w * 0.1f, center = androidx.compose.ui.geometry.Offset(w * 0.28f, h * 0.82f))
    drawCircle(color = color, radius = w * 0.1f, center = androidx.compose.ui.geometry.Offset(w * 0.72f, h * 0.82f))
}

private fun DrawScope.drawHospital(color: Color) {
    val w = size.width; val h = size.height
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.15f), end = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.85f), strokeWidth = w * 0.22f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.5f), end = androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.5f), strokeWidth = w * 0.22f)
    drawLine(color.copy(alpha = 0f), start = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.15f), end = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.85f), strokeWidth = w * 0.22f)
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew compileDebugKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/main/java/com/myspace/app/ui/components/PinIconPicker.kt
git commit -m "feat: add PinIconPicker composable with 8 Canvas icon variants"
```

---

### Task 5: Map Pins enhancements — star rating, review note, share, icon picker

**Files:**
- Modify: `android/app/src/main/java/com/myspace/app/ui/screens/MapPinsScreen.kt`

**Interfaces:**
- Consumes: `LZString.compressToEncodedURIComponent(String)`, `PinIconPicker(selected, onSelect, accentColor)`, `PinIconCanvas(id, color, size)`, `PIN_ICON_IDS`
- `MapPinEntity` already has `rating: Int` and `reviewNote: String`
- `MapStackEntity` already has `icon: String`

- [ ] **Step 1: Add star rating composable and share URL builder**

At the top of `MapPinsScreen.kt`, after the existing imports, add:

```kotlin
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.ui.platform.LocalContext
import com.myspace.app.ui.components.PinIconPicker
import com.myspace.app.ui.components.PinIconCanvas
import com.myspace.app.ui.components.PIN_ICON_IDS
import com.myspace.app.util.LZString
```

Add a `StarRating` composable after the existing private helper functions (before `MapPinsScreen`):

```kotlin
@Composable
private fun StarRating(value: Int, onChange: ((Int) -> Unit)? = null) {
    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        (1..5).forEach { i ->
            val filled = i <= value
            Icon(
                imageVector = if (filled) Icons.Default.Star else Icons.Default.StarBorder,
                contentDescription = null,
                tint = if (filled) Color(0xFFFBBF24) else Color(0x33FFFFFF),
                modifier = Modifier
                    .size(16.dp)
                    .then(if (onChange != null) Modifier.clickable { onChange(if (value == i) 0 else i) } else Modifier),
            )
        }
    }
}
```

Add a `buildShareUrl` function:

```kotlin
private fun buildShareUrl(stack: MapStackEntity, pins: List<MapPinEntity>): String {
    val pinsJson = pins.joinToString(",") { p ->
        """{"label":${escapeJson(p.label)},"lat":${p.lat},"lng":${p.lng},"note":${escapeJson(p.note)},"url":${escapeJson(p.url)}}"""
    }
    val payload = """{"name":${escapeJson(stack.name)},"color":${escapeJson(stack.color)},"pins":[$pinsJson]}"""
    val compressed = LZString.compressToEncodedURIComponent(payload)
    val firstPin = pins.firstOrNull()
    val lat = firstPin?.lat ?: 0.0
    val lng = firstPin?.lng ?: 0.0
    return "https://www.google.com/maps/search/?api=1&query=$lat,$lng#myspace-pins?d=$compressed"
}

private fun escapeJson(s: String): String = "\"${s.replace("\\", "\\\\").replace("\"", "\\\"")}\""
```

- [ ] **Step 2: Wire icon picker into "New Stack" and edit dialogs**

In the "New Stack" `AlertDialog` text block, after the color picker rows, add:

```kotlin
Spacer(Modifier.height(4.dp))
Text("Icon", fontSize = 13.sp, color = Color(0x88FFFFFF))
PinIconPicker(
    selected = newStackIcon,
    onSelect = { newStackIcon = it },
    accentColor = parseStackColor(newStackColor),
)
```

Add `var newStackIcon by remember { mutableStateOf(PIN_ICON_IDS.first()) }` alongside the existing `newStackName`/`newStackColor` state. Pass `icon = newStackIcon` in the `MapStackEntity(...)` upsert call (the field already exists on the entity).

- [ ] **Step 3: Update MapStackCard to show the icon**

In `MapStackCard`, replace the existing color dot `Box` with:

```kotlin
Box(
    modifier = Modifier
        .size(14.dp)
        .clip(CircleShape)
        .background(accent),
)
```

→ replace with:

```kotlin
Box(
    modifier = Modifier
        .size(32.dp)
        .clip(RoundedCornerShape(8.dp))
        .background(accent.copy(alpha = 0.2f)),
    contentAlignment = Alignment.Center,
) {
    PinIconCanvas(id = stack.icon.ifBlank { "pin" }, color = accent, size = 18.dp)
}
```

- [ ] **Step 4: Add star rating and review note to PinRow (read mode)**

In `PinRow`, after the priority + category chips row, add:

```kotlin
if (pin.rating > 0) {
    StarRating(value = pin.rating)
}
if (pin.reviewNote.isNotBlank()) {
    Spacer(Modifier.height(2.dp))
    Text(
        "\"${pin.reviewNote}\"",
        fontSize = 11.sp,
        color = Color(0x66FFFFFF),
        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
        lineHeight = 15.sp,
    )
}
```

- [ ] **Step 5: Add star rating and review note to add-pin dialog**

In the `AlertDialog` for adding a pin, after the priority selector, add:

```kotlin
Text("Rating", fontSize = 13.sp, color = Color(0x88FFFFFF))
StarRating(value = newRating, onChange = { newRating = it })
OutlinedTextField(
    value = newReviewNote,
    onValueChange = { newReviewNote = it },
    label = { Text("Review (optional)") },
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    colors = mapsFieldColors(),
    maxLines = 2,
)
```

Add state vars alongside existing ones:
```kotlin
var newRating by remember { mutableStateOf(0) }
var newReviewNote by remember { mutableStateOf("") }
```

Pass them in the `MapPinEntity(...)` upsert: `rating = newRating, reviewNote = newReviewNote.trim()`.
Reset them in the "clear form" block: `newRating = 0; newReviewNote = ""`.

- [ ] **Step 6: Add Share button to stack detail view header**

In `MapPinsStackView`, add to the top `Row` header after the pin count text:

```kotlin
val context = LocalContext.current
IconButton(onClick = {
    val url = buildShareUrl(stack, pins)
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("My SPACE share link", url))
}) {
    Icon(Icons.Default.Share, "Share", tint = accent.copy(alpha = 0.8f), modifier = Modifier.size(20.dp))
}
```

Add `import androidx.compose.material.icons.filled.Share` and `import androidx.compose.material.icons.filled.Star` and `import androidx.compose.material.icons.filled.StarBorder`.

- [ ] **Step 7: Verify compilation**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew compileDebugKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 8: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/main/java/com/myspace/app/ui/screens/MapPinsScreen.kt
git commit -m "feat(map-pins): add star rating, review note, icon picker, share link"
```

---

### Task 6: Settings screen

**Files:**
- Create: `android/app/src/main/java/com/myspace/app/ui/screens/SettingsScreen.kt`
- Modify: `android/app/src/main/java/com/myspace/app/ui/MySpaceApp.kt`
- Modify: `android/app/src/main/java/com/myspace/app/MainActivity.kt`

**Interfaces:**
- Produces: `@Composable fun SettingsScreen(context: Context, onLockNow: () -> Unit)`
- `onLockNow` callback navigates pager to page 0 and sets `sessionLocked = true` in `MySpaceApp`

- [ ] **Step 1: Create SettingsScreen.kt**

Create `android/app/src/main/java/com/myspace/app/ui/screens/SettingsScreen.kt`:

```kotlin
package com.myspace.app.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.biometric.BiometricManager
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.BuildConfig
import com.myspace.app.ui.theme.AccentSync
import com.myspace.app.ui.theme.AccentVault
import com.myspace.app.ui.theme.BgCard
import com.myspace.app.ui.theme.BgCardBorder

private const val PREFS_NAME = "myspace_settings"
private const val KEY_AUTOLOCK_MS = "autolock_ms"
private const val KEY_BIOMETRIC = "biometric_enabled"

private val AUTO_LOCK_OPTIONS = listOf(
    "5m" to 5 * 60 * 1000L,
    "15m" to 15 * 60 * 1000L,
    "30m" to 30 * 60 * 1000L,
    "∞" to 0L,
)

@Composable
fun SettingsScreen(context: Context, onLockNow: () -> Unit) {
    val prefs = remember { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }

    var autoLockMs by remember { mutableLongStateOf(prefs.getLong(KEY_AUTOLOCK_MS, 15 * 60 * 1000L)) }
    var biometricEnabled by remember { mutableStateOf(prefs.getBoolean(KEY_BIOMETRIC, false)) }

    val biometricAvailable = remember {
        BiometricManager.from(context)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // ── Security ─────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "SECURITY",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                if (biometricAvailable) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Biometric unlock", fontSize = 14.sp, color = Color.White)
                            Text("Use fingerprint to unlock vault", fontSize = 12.sp, color = Color(0x77FFFFFF))
                        }
                        Switch(
                            checked = biometricEnabled,
                            onCheckedChange = {
                                biometricEnabled = it
                                prefs.edit().putBoolean(KEY_BIOMETRIC, it).apply()
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = AccentVault,
                                uncheckedTrackColor = BgCardBorder,
                            ),
                        )
                    }
                } else {
                    Text(
                        "Biometric unlock not available on this device",
                        fontSize = 13.sp,
                        color = Color(0x44FFFFFF),
                    )
                }
            }
        }

        // ── Auto-lock ─────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "AUTO-LOCK",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AUTO_LOCK_OPTIONS.forEach { (label, ms) ->
                        val selected = autoLockMs == ms
                        Button(
                            onClick = {
                                autoLockMs = ms
                                prefs.edit().putLong(KEY_AUTOLOCK_MS, ms).apply()
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) AccentSync.copy(alpha = 0.2f) else BgCardBorder,
                                contentColor = if (selected) AccentSync else Color(0x88FFFFFF),
                            ),
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 10.dp),
                            elevation = ButtonDefaults.buttonElevation(0.dp),
                        ) {
                            Text(label, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }
        }

        // ── Lock Now ─────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "SESSION",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                Button(
                    onClick = onLockNow,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AccentVault.copy(alpha = 0.15f),
                        contentColor = AccentVault,
                    ),
                    elevation = ButtonDefaults.buttonElevation(0.dp),
                ) {
                    Icon(Icons.Default.Lock, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Lock Now", fontSize = 14.sp)
                }
            }
        }

        // ── About ─────────────────────────────────────────────────────────────
        Card(
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "ABOUT",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = Color(0x66FFFFFF),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Version", fontSize = 14.sp, color = Color.White, modifier = Modifier.weight(1f))
                    Text(BuildConfig.VERSION_NAME, fontSize = 13.sp, color = Color(0x77FFFFFF))
                }
                HorizontalDivider(color = Color(0x15FFFFFF))
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://my-space-rouge.vercel.app/privacy-policy.html")))
                    },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Text("Privacy Policy", fontSize = 14.sp, color = AccentSync)
                }
                HorizontalDivider(color = Color(0x15FFFFFF))
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://my-space-rouge.vercel.app/terms-of-service.html")))
                    },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    Text("Terms of Service", fontSize = 14.sp, color = AccentSync)
                }
            }
        }
    }
}
```

- [ ] **Step 2: Add biometric dependency**

In `app/build.gradle.kts`, in the `dependencies` block, add:

```kotlin
implementation("androidx.biometric:biometric:1.2.0-alpha05")
```

- [ ] **Step 3: Add Screen.Settings to MySpaceApp.kt**

In `MySpaceApp.kt`, in the `sealed class Screen` block, add after `Screen.Sync`:

```kotlin
object Settings : Screen("settings", "Settings", Icons.Default.Settings, AccentSync)
```

In `val allScreens = listOf(...)`, append `Screen.Settings` at the end.

In the `HorizontalPager` `when` block, add:

```kotlin
Screen.Settings -> SettingsScreen(
    context = context,
    onLockNow = {
        scope.launch { pagerState.animateScrollToPage(0) }
    },
)
```

Add `import com.myspace.app.ui.screens.SettingsScreen` and `import androidx.compose.material.icons.filled.Settings`.

Add `val context = LocalContext.current` at the top of `MySpaceApp()` composable (after `val db = ...`).

- [ ] **Step 4: Verify compilation**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew compileDebugKotlin 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/main/java/com/myspace/app/ui/screens/SettingsScreen.kt \
        android/app/src/main/java/com/myspace/app/ui/MySpaceApp.kt \
        android/app/build.gradle.kts
git commit -m "feat: add Settings screen with auto-lock, biometric toggle, lock-now, about"
```

---

### Task 7: JVM unit tests — Generator and LZString (already done in Task 1), plus share round-trip

**Files:**
- Create: `android/app/src/test/java/com/myspace/app/GeneratorTest.kt`

**Interfaces:**
- Consumes: `generatePassword(length: Int, upper: Boolean, digits: Boolean, symbols: Boolean): String` from `com.myspace.app.ui.screens`

- [ ] **Step 1: Write GeneratorTest**

Create `android/app/src/test/java/com/myspace/app/GeneratorTest.kt`:

```kotlin
package com.myspace.app

import com.myspace.app.ui.screens.generatePassword
import org.junit.Assert.*
import org.junit.Test

class GeneratorTest {

    @Test fun `generated password has requested length`() {
        assertEquals(20, generatePassword(20, upper = true, digits = true, symbols = false).length)
        assertEquals(8,  generatePassword(8,  upper = false, digits = true, symbols = false).length)
        assertEquals(64, generatePassword(64, upper = true, digits = true, symbols = true).length)
    }

    @Test fun `lowercase always included in pool`() {
        val pw = generatePassword(200, upper = false, digits = false, symbols = false)
        assertTrue("should contain lowercase", pw.any { it.isLowerCase() })
        assertFalse("should not contain uppercase", pw.any { it.isUpperCase() })
        assertFalse("should not contain digit", pw.any { it.isDigit() })
    }

    @Test fun `uppercase included when flag is true`() {
        val pw = generatePassword(200, upper = true, digits = false, symbols = false)
        assertTrue(pw.any { it.isUpperCase() })
    }

    @Test fun `digits included when flag is true`() {
        val pw = generatePassword(200, upper = false, digits = true, symbols = false)
        assertTrue(pw.any { it.isDigit() })
    }

    @Test fun `symbols included when flag is true`() {
        val symbols = "!@#\$%^&*()-_=+[]{}|;:,.<>?"
        val pw = generatePassword(200, upper = false, digits = false, symbols = true)
        assertTrue(pw.any { it in symbols })
    }

    @Test fun `consecutive calls produce different passwords`() {
        val pw1 = generatePassword(20, upper = true, digits = true, symbols = false)
        val pw2 = generatePassword(20, upper = true, digits = true, symbols = false)
        assertNotEquals(pw1, pw2)
    }
}
```

- [ ] **Step 2: Run GeneratorTest — expect PASS**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew test --tests "com.myspace.app.GeneratorTest" 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL` — 6 tests passed.

- [ ] **Step 3: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/src/test/java/com/myspace/app/GeneratorTest.kt
git commit -m "test: add GeneratorTest for generatePassword"
```

---

### Task 8: Instrumented tests — Room CRUD + crypto

**Files:**
- Modify: `android/app/build.gradle.kts`
- Modify: `android/gradle/libs.versions.toml`
- Create: `android/app/src/androidTest/java/com/myspace/app/AppDatabaseTest.kt`
- Create: `android/app/src/androidTest/java/com/myspace/app/CryptoManagerTest.kt`

**Interfaces:**
- Consumes: `AppDatabase`, all DAO interfaces, `CryptoManager.encrypt`, `CryptoManager.decrypt`

- [ ] **Step 1: Add instrumented test dependencies**

In `android/gradle/libs.versions.toml`, in `[libraries]`, add:

```toml
androidx-room-testing = { group = "androidx.room", name = "room-testing", version.ref = "room" }
androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version = "1.2.1" }
androidx-test-runner = { group = "androidx.test", name = "runner", version = "1.6.1" }
androidx-test-rules = { group = "androidx.test", name = "rules", version = "1.6.1" }
```

In `app/build.gradle.kts`, in `defaultConfig`, add:

```kotlin
testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
```

In `dependencies`, add:

```kotlin
testImplementation(libs.androidx.room.testing)
androidTestImplementation(libs.androidx.test.ext.junit)
androidTestImplementation(libs.androidx.test.runner)
androidTestImplementation(libs.androidx.test.rules)
```

- [ ] **Step 2: Write AppDatabaseTest**

Create `android/app/src/androidTest/java/com/myspace/app/AppDatabaseTest.kt`:

```kotlin
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
```

- [ ] **Step 3: Write CryptoManagerTest**

Create `android/app/src/androidTest/java/com/myspace/app/CryptoManagerTest.kt`:

```kotlin
package com.myspace.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.myspace.app.crypto.CryptoManager
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import javax.crypto.AEADBadTagException
import android.util.Base64

@RunWith(AndroidJUnit4::class)
class CryptoManagerTest {

    @Test fun encryptDecryptRoundTrip() {
        val plaintext = "super-secret-password-123"
        val (ct, iv) = CryptoManager.encrypt(plaintext)
        val decrypted = CryptoManager.decrypt(ct, iv)
        assertEquals(plaintext, decrypted)
    }

    @Test fun encryptDecryptEmptyString() {
        val (ct, iv) = CryptoManager.encrypt("")
        assertEquals("", CryptoManager.decrypt(ct, iv))
    }

    @Test fun encryptDecryptUnicode() {
        val plaintext = "パスワード 🔐 тест"
        val (ct, iv) = CryptoManager.encrypt(plaintext)
        assertEquals(plaintext, CryptoManager.decrypt(ct, iv))
    }

    @Test fun twoEncryptionsProduceDifferentCiphertext() {
        val (ct1, _) = CryptoManager.encrypt("same-input")
        val (ct2, _) = CryptoManager.encrypt("same-input")
        assertNotEquals(ct1, ct2)
    }

    @Test fun twoEncryptionsProduceDifferentIVs() {
        val (_, iv1) = CryptoManager.encrypt("test")
        val (_, iv2) = CryptoManager.encrypt("test")
        assertNotEquals(iv1, iv2)
    }

    @Test fun decryptWithWrongIVThrows() {
        val (ct, _) = CryptoManager.encrypt("hello")
        val (_, wrongIv) = CryptoManager.encrypt("other")
        try {
            CryptoManager.decrypt(ct, wrongIv)
            fail("Expected AEADBadTagException")
        } catch (e: AEADBadTagException) {
            // expected
        }
    }
}
```

- [ ] **Step 4: Run instrumented tests on emulator**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./run-emulator.sh --test 2>&1 | tail -20
```

If the `--test` flag doesn't exist yet (Task 11 adds it), run directly:

```bash
./gradlew connectedAndroidTest 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL` — all instrumented tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/build.gradle.kts \
        android/gradle/libs.versions.toml \
        android/app/src/androidTest/java/com/myspace/app/AppDatabaseTest.kt \
        android/app/src/androidTest/java/com/myspace/app/CryptoManagerTest.kt
git commit -m "test: add instrumented Room CRUD and CryptoManager tests"
```

---

### Task 9: Signing config in build.gradle.kts

**Files:**
- Modify: `android/app/build.gradle.kts`
- Modify: `.gitignore`

- [ ] **Step 1: Add signingConfigs block**

In `android/app/build.gradle.kts`, add a `signingConfigs` block inside `android { }`, before `buildTypes`:

```kotlin
signingConfigs {
    val keystoreProps = java.util.Properties()
    val propsFile = rootProject.file("keystore.properties")
    if (propsFile.exists()) keystoreProps.load(propsFile.inputStream())

    create("release") {
        keyAlias     = keystoreProps.getProperty("keyAlias")     ?: ""
        keyPassword  = keystoreProps.getProperty("keyPassword")  ?: ""
        storeFile    = keystoreProps.getProperty("storeFile")?.let { file(it) }
        storePassword = keystoreProps.getProperty("storePassword") ?: ""
    }
}
```

In `buildTypes`, update the `release` block to use it:

```kotlin
release {
    isMinifyEnabled = true
    proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    signingConfig = signingConfigs.getByName("release")
}
```

- [ ] **Step 2: Update .gitignore**

In the root `.gitignore` (create it if it doesn't exist — check with `ls /Users/cuongquachc/Projects/poc/my-space/.gitignore`), add:

```
# Android signing — never commit these
android/keystore.properties
android/output/*.aab
android/output/*.apk
```

- [ ] **Step 3: Verify debug build still works**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew assembleDebug 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/app/build.gradle.kts .gitignore
git commit -m "build: add release signing config reading keystore.properties"
```

---

### Task 10: build-release.sh signing script

**Files:**
- Create: `android/build-release.sh`

- [ ] **Step 1: Create the script**

Create `android/build-release.sh`:

```bash
#!/usr/bin/env bash
# Signs and builds the release AAB for My SPACE Android.
# Usage:
#   KEYSTORE_PATH=keys/myspace-release.jks \
#   STORE_PASSWORD=... \
#   KEY_ALIAS=myspace \
#   KEY_PASSWORD=... \
#   ./android/build-release.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROPS_FILE="$SCRIPT_DIR/keystore.properties"

# ── Validate required env vars ────────────────────────────────────────────────
for var in KEYSTORE_PATH STORE_PASSWORD KEY_ALIAS KEY_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is not set" >&2
    exit 1
  fi
done

if [[ ! -f "$REPO_ROOT/$KEYSTORE_PATH" ]] && [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "ERROR: Keystore not found at $KEYSTORE_PATH" >&2
  exit 1
fi

KEYSTORE_ABS="$(cd "$(dirname "$KEYSTORE_PATH")" && pwd)/$(basename "$KEYSTORE_PATH")"

# ── Write keystore.properties (cleaned up on exit) ───────────────────────────
cleanup() { rm -f "$PROPS_FILE"; }
trap cleanup EXIT

cat > "$PROPS_FILE" <<EOF
storeFile=$KEYSTORE_ABS
storePassword=$STORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF

# ── Build ─────────────────────────────────────────────────────────────────────
echo "▶ Building release AAB..."
cd "$SCRIPT_DIR"
./gradlew bundleRelease

# ── Copy output ───────────────────────────────────────────────────────────────
VERSION=$(grep 'versionName' "$SCRIPT_DIR/app/build.gradle.kts" | head -1 | grep -oP '"[^"]+"' | tr -d '"')
OUTDIR="$SCRIPT_DIR/output"
mkdir -p "$OUTDIR"
AAB_SRC="$SCRIPT_DIR/app/build/outputs/bundle/release/app-release.aab"
AAB_DST="$OUTDIR/myspace-$VERSION.aab"
cp "$AAB_SRC" "$AAB_DST"

echo "✓ AAB: $AAB_DST"
echo "SHA-256: $(shasum -a 256 "$AAB_DST" | awk '{print $1}')"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/cuongquachc/Projects/poc/my-space/android/build-release.sh
```

- [ ] **Step 3: Verify script syntax**

```bash
bash -n /Users/cuongquachc/Projects/poc/my-space/android/build-release.sh && echo "syntax OK"
```

Expected: `syntax OK`

- [ ] **Step 4: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/build-release.sh
git commit -m "build: add build-release.sh for signed AAB production"
```

---

### Task 11: run-emulator.sh — --unit and --test flags

**Files:**
- Modify: `android/run-emulator.sh`

- [ ] **Step 1: Rewrite run-emulator.sh with flags**

Replace the entire content of `android/run-emulator.sh` with:

```bash
#!/usr/bin/env zsh
# Run My SPACE on Android emulator, or run tests.
# Usage:
#   ./run-emulator.sh            — boot emulator and install debug build
#   ./run-emulator.sh --unit     — run JVM unit tests (no emulator needed)
#   ./run-emulator.sh --test     — boot emulator, run instrumented tests, exit with result code

set -euo pipefail

ANDROID_HOME=/Users/cuongquachc/Library/Android/sdk
ADB=$ANDROID_HOME/platform-tools/adb
EMULATOR=$ANDROID_HOME/emulator/emulator
AVD=MySpace35

# ── Helpers ───────────────────────────────────────────────────────────────────

boot_emulator() {
  if $ADB devices | grep -q "emulator"; then
    echo "✓ Emulator already running"
    return
  fi
  echo "▶ Starting emulator $AVD..."
  ANDROID_HOME=$ANDROID_HOME $EMULATOR -avd $AVD -no-audio -no-boot-anim > /tmp/emulator.log 2>&1 &
  $ADB wait-for-device
  local waited=0
  until [ "$($ADB shell getprop sys.boot_completed 2>/dev/null)" = "1" ]; do
    sleep 3
    waited=$((waited + 3))
    if [ $waited -ge 120 ]; then
      echo "ERROR: Emulator boot timed out after 120 s" >&2; exit 1
    fi
  done
  echo "✓ Emulator ready"
}

# ── Mode dispatch ──────────────────────────────────────────────────────────────

MODE="${1:-run}"

case "$MODE" in
  --unit)
    echo "▶ Running JVM unit tests..."
    ./gradlew test
    REPORT="app/build/reports/tests/testDebugUnitTest/index.html"
    [ -f "$REPORT" ] && echo "Report: $(pwd)/$REPORT"
    ;;
  --test)
    boot_emulator
    echo "▶ Running instrumented tests..."
    ./gradlew connectedAndroidTest
    REPORT="app/build/reports/androidTests/connected/index.html"
    [ -f "$REPORT" ] && echo "Report: $(pwd)/$REPORT"
    ;;
  run|*)
    boot_emulator
    echo "▶ Building & installing app..."
    ./gradlew installDebug
    echo "▶ Launching app..."
    $ADB shell am start -n com.myspace.app/.MainActivity
    echo "✓ Done — My SPACE is running"
    ;;
esac
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/cuongquachc/Projects/poc/my-space/android/run-emulator.sh
```

- [ ] **Step 3: Verify unit tests run via the script**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./run-emulator.sh --unit 2>&1 | tail -15
```

Expected: `BUILD SUCCESSFUL` and a report path line.

- [ ] **Step 4: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add android/run-emulator.sh
git commit -m "build: add --unit and --test flags to run-emulator.sh"
```

---

### Task 12: GitHub Actions CI/CD workflow

**Files:**
- Create: `.github/workflows/android-release.yml`

- [ ] **Step 1: Create the workflow**

```bash
mkdir -p /Users/cuongquachc/Projects/poc/my-space/.github/workflows
```

Create `.github/workflows/android-release.yml`:

```yaml
name: Android Release

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  unit-test:
    name: JVM Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Run unit tests
        working-directory: android
        run: ./gradlew test

      - name: Upload unit test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-report
          path: android/app/build/reports/tests/
          retention-days: 14

  instrumented-test:
    name: Instrumented Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: Run instrumented tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          arch: x86_64
          profile: Nexus 6
          script: cd android && ./gradlew connectedAndroidTest

      - name: Upload instrumented test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: instrumented-test-report
          path: android/app/build/reports/androidTests/
          retention-days: 14

  release-build:
    name: Signed Release AAB
    needs: [unit-test, instrumented-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Decode keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > /tmp/myspace-release.jks

      - name: Write keystore.properties
        run: |
          cat > android/keystore.properties <<EOF
          storeFile=/tmp/myspace-release.jks
          storePassword=${{ secrets.STORE_PASSWORD }}
          keyAlias=${{ secrets.KEY_ALIAS }}
          keyPassword=${{ secrets.KEY_PASSWORD }}
          EOF

      - name: Build release AAB
        working-directory: android
        run: ./gradlew bundleRelease

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: myspace-release-aab
          path: android/app/build/outputs/bundle/release/app-release.aab
          retention-days: 90

      # Uncomment when Play Store service account is configured:
      # - name: Upload to Play Store (internal track)
      #   uses: r0adkll/upload-google-play@v1
      #   with:
      #     serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
      #     packageName: com.myspace.app
      #     releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
      #     track: internal
```

- [ ] **Step 2: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('/Users/cuongquachc/Projects/poc/my-space/.github/workflows/android-release.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git add .github/workflows/android-release.yml
git commit -m "ci: add GitHub Actions workflow for unit tests, instrumented tests, and signed AAB release"
```

---

### Task 13: Full smoke test and final commit

- [ ] **Step 1: Run all JVM tests**

```bash
cd /Users/cuongquachc/Projects/poc/my-space/android
./gradlew test 2>&1 | tail -15
```

Expected: `BUILD SUCCESSFUL` — all test classes pass including `BillingCalcTest`, `TagUtilsTest`, `LZStringTest`, `GeneratorTest`.

- [ ] **Step 2: Verify debug APK builds cleanly**

```bash
./gradlew assembleDebug 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Verify gitignore blocks keystore.properties**

```bash
echo "test" > /Users/cuongquachc/Projects/poc/my-space/android/keystore.properties
git -C /Users/cuongquachc/Projects/poc/my-space status | grep keystore
```

Expected: `keystore.properties` does NOT appear in `git status` output (it is ignored).

```bash
rm /Users/cuongquachc/Projects/poc/my-space/android/keystore.properties
```

- [ ] **Step 4: Final summary commit (if any loose files)**

```bash
cd /Users/cuongquachc/Projects/poc/my-space
git status
```

If there are any modified files not yet committed, stage and commit them now.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Vault search bar + tag filter | Task 3 |
| SecretDao search queries | Task 2 |
| TagUtils pure helpers | Task 1 |
| Map Pins star rating + review note | Task 5 |
| Map Pins icon picker | Tasks 4 + 5 |
| Map Pins share link | Tasks 1 (LZString) + 5 |
| Settings screen — biometric toggle | Task 6 |
| Settings screen — auto-lock | Task 6 |
| Settings screen — lock now | Task 6 |
| Settings screen — about/version/links | Task 6 |
| JVM test: GeneratorTest | Task 7 |
| JVM test: TagUtilsTest | Task 1 |
| JVM test: LZStringTest | Task 1 |
| Instrumented: AppDatabaseTest | Task 8 |
| Instrumented: CryptoManagerTest | Task 8 |
| Test deps in build.gradle.kts | Task 8 |
| Signing config in build.gradle.kts | Task 9 |
| .gitignore entries | Task 9 |
| build-release.sh | Task 10 |
| run-emulator.sh --unit/--test | Task 11 |
| GitHub Actions CI/CD | Task 12 |

All spec requirements are covered. No gaps found.
{% endraw %}
