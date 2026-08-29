package com.myspace.app.service

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.myspace.app.crypto.VaultCrypto
import com.myspace.app.data.dao.*
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Reads all DAOs, decrypts secret values, and serialises into the same JSON
 * format used by the Chrome extension's backup.
 */
@Singleton
class DatabaseExporter @Inject constructor(
    private val noteDao: NoteDao,
    private val secretDao: SecretDao,
    private val subDao: SubscriptionDao,
    private val billDao: BillDao,
    private val todoListDao: TodoListDao,
    private val todoTaskDao: TodoTaskDao,
    private val mapStackDao: MapStackDao,
    private val mapPinDao: MapPinDao,
    private val crypto: VaultCrypto
) {
    private val gson = Gson()

    suspend fun exportToJson(): String {
        val root = JsonObject()

        // Notes
        val notesArr = JsonArray()
        noteDao.search("").forEach { n ->
            notesArr.add(JsonObject().apply {
                addProperty("id", n.id)
                addProperty("title", n.title)
                addProperty("content", n.content)
                add("tags", gson.toJsonTree(n.tags))
                add("imageData", gson.toJsonTree(n.imageData))
                addProperty("createdAt", n.createdAt)
                addProperty("updatedAt", n.updatedAt)
            })
        }
        root.add("notes", notesArr)

        // Secrets — decrypt so backup stores plaintext (re-encrypted on import)
        val secretsArr = JsonArray()
        secretDao.search("").forEach { s ->
            val plainValue = try { crypto.decrypt(s.ciphertext, s.iv) } catch (_: Exception) { "" }
            secretsArr.add(JsonObject().apply {
                addProperty("id", s.id)
                addProperty("label", s.label)
                addProperty("value", plainValue)
                add("tags", gson.toJsonTree(s.tags))
                addProperty("url", s.url)
                addProperty("description", s.description)
                addProperty("createdAt", s.createdAt)
                addProperty("updatedAt", s.updatedAt)
            })
        }
        root.add("secrets", secretsArr)

        // Subscriptions
        val subsArr = JsonArray()
        subDao.observeAll().first().forEach { s ->
            subsArr.add(JsonObject().apply {
                addProperty("id", s.id)
                addProperty("name", s.name)
                addProperty("amount", s.amount)
                addProperty("currency", s.currency)
                addProperty("cycle", s.cycle)
                addProperty("startDate", s.startDate)
                add("tags", gson.toJsonTree(s.tags))
                addProperty("notes", s.notes)
                addProperty("active", s.active)
                addProperty("createdAt", s.createdAt)
                addProperty("updatedAt", s.updatedAt)
            })
        }
        root.add("subscriptions", subsArr)

        // Bills
        val billsArr = JsonArray()
        billDao.getAll().forEach { b ->
            billsArr.add(JsonObject().apply {
                addProperty("subId", b.subId)
                addProperty("year", b.year)
                addProperty("month", b.month)
                addProperty("amount", b.amount)
                addProperty("currency", b.currency)
                addProperty("notes", b.notes)
            })
        }
        root.add("bills", billsArr)

        // Todo lists
        val todoLists = todoListDao.observeAll().first()
        val todoListsArr = JsonArray()
        todoLists.forEach { l ->
            todoListsArr.add(JsonObject().apply {
                addProperty("id", l.id)
                addProperty("name", l.name)
                addProperty("color", l.color)
                addProperty("icon", l.icon)
                addProperty("createdAt", l.createdAt)
            })
        }
        root.add("todoLists", todoListsArr)

        // Todo tasks — iterate per list
        val todoTasksArr = JsonArray()
        todoLists.forEach { list ->
            todoTaskDao.observeByList(list.id).first().forEach { t ->
                todoTasksArr.add(JsonObject().apply {
                    addProperty("id", t.id)
                    addProperty("listId", t.listId)
                    addProperty("title", t.title)
                    addProperty("note", t.note)
                    addProperty("priority", t.priority)
                    t.dueDate?.let { addProperty("dueDate", it) }
                    addProperty("recurrence", t.recurrence)
                    addProperty("done", t.done)
                    addProperty("createdAt", t.createdAt)
                    addProperty("updatedAt", t.updatedAt)
                })
            }
        }
        root.add("todoTasks", todoTasksArr)

        // Map stacks
        val mapStacks = mapStackDao.observeAll().first()
        val mapStacksArr = JsonArray()
        mapStacks.forEach { s ->
            mapStacksArr.add(JsonObject().apply {
                addProperty("id", s.id)
                addProperty("name", s.name)
                addProperty("color", s.color)
                addProperty("icon", s.icon)
                addProperty("createdAt", s.createdAt)
            })
        }
        root.add("mapStacks", mapStacksArr)

        // Map pins — iterate per stack
        val mapPinsArr = JsonArray()
        mapStacks.forEach { stack ->
            mapPinDao.observeByStack(stack.id).first().forEach { p ->
                mapPinsArr.add(JsonObject().apply {
                    addProperty("id", p.id)
                    addProperty("stackId", p.stackId)
                    addProperty("label", p.label)
                    addProperty("lat", p.lat)
                    addProperty("lng", p.lng)
                    addProperty("url", p.url)
                    addProperty("note", p.note)
                    addProperty("priority", p.priority)
                    addProperty("category", p.category)
                    addProperty("rating", p.rating)
                    addProperty("reviewNote", p.reviewNote)
                    addProperty("createdAt", p.createdAt)
                })
            }
        }
        root.add("mapPins", mapPinsArr)

        return gson.toJson(root)
    }

    suspend fun importFromJson(json: String) {
        val root = gson.fromJson(json, JsonObject::class.java)

        root.getAsJsonArray("notes")?.forEach { el ->
            val o = el.asJsonObject
            noteDao.upsert(com.myspace.app.data.entity.NoteEntity(
                id        = o["id"].asString,
                title     = o["title"]?.asString ?: "",
                content   = o["content"]?.asString ?: "",
                tags      = o["tags"]?.toString() ?: "[]",
                imageData = o["imageData"]?.toString() ?: "[]",
                createdAt = o["createdAt"]?.asLong ?: System.currentTimeMillis(),
                updatedAt = o["updatedAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }

        root.getAsJsonArray("secrets")?.forEach { el ->
            val o = el.asJsonObject
            val plainValue = o["value"]?.asString ?: ""
            val enc = if (plainValue.isNotBlank()) crypto.encrypt(plainValue)
                      else VaultCrypto.EncryptResult("", "")
            secretDao.upsert(com.myspace.app.data.entity.SecretEntity(
                id          = o["id"].asString,
                label       = o["label"]?.asString ?: "",
                ciphertext  = enc.ciphertext,
                iv          = enc.iv,
                tags        = o["tags"]?.toString() ?: "[]",
                url         = o["url"]?.asString ?: "",
                description = o["description"]?.asString ?: "",
                createdAt   = o["createdAt"]?.asLong ?: System.currentTimeMillis(),
                updatedAt   = o["updatedAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }

        root.getAsJsonArray("subscriptions")?.forEach { el ->
            val o = el.asJsonObject
            subDao.upsert(com.myspace.app.data.entity.SubscriptionEntity(
                id        = o["id"].asString,
                name      = o["name"]?.asString ?: "",
                amount    = o["amount"]?.asDouble ?: 0.0,
                currency  = o["currency"]?.asString ?: "USD",
                cycle     = o["cycle"]?.asString ?: "monthly",
                startDate = o["startDate"]?.asString ?: "",
                tags      = o["tags"]?.toString() ?: "[]",
                notes     = o["notes"]?.asString ?: "",
                active    = o["active"]?.asBoolean ?: true,
                createdAt = o["createdAt"]?.asLong ?: System.currentTimeMillis(),
                updatedAt = o["updatedAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }

        root.getAsJsonArray("bills")?.forEach { el ->
            val o = el.asJsonObject
            billDao.upsert(com.myspace.app.data.entity.BillEntity(
                subId    = o["subId"].asString,
                year     = o["year"].asInt,
                month    = o["month"].asInt,
                amount   = o["amount"]?.asDouble ?: 0.0,
                currency = o["currency"]?.asString ?: "USD",
                notes    = o["notes"]?.asString ?: ""
            ))
        }

        root.getAsJsonArray("todoLists")?.forEach { el ->
            val o = el.asJsonObject
            todoListDao.upsert(com.myspace.app.data.entity.TodoListEntity(
                id        = o["id"].asString,
                name      = o["name"]?.asString ?: "",
                color     = o["color"]?.asString ?: "#6ee7b7",
                icon      = o["icon"]?.asString ?: "",
                createdAt = o["createdAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }

        root.getAsJsonArray("todoTasks")?.forEach { el ->
            val o = el.asJsonObject
            todoTaskDao.upsert(com.myspace.app.data.entity.TodoTaskEntity(
                id         = o["id"].asString,
                listId     = o["listId"]?.asString ?: "",
                title      = o["title"]?.asString ?: "",
                note       = o["note"]?.asString ?: "",
                priority   = o["priority"]?.asString ?: "low",
                dueDate    = if (o.has("dueDate") && !o["dueDate"].isJsonNull) o["dueDate"].asLong else null,
                recurrence = o["recurrence"]?.asString ?: "none",
                done       = o["done"]?.asBoolean ?: false,
                createdAt  = o["createdAt"]?.asLong ?: System.currentTimeMillis(),
                updatedAt  = o["updatedAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }

        root.getAsJsonArray("mapStacks")?.forEach { el ->
            val o = el.asJsonObject
            mapStackDao.upsert(com.myspace.app.data.entity.MapStackEntity(
                id        = o["id"].asString,
                name      = o["name"]?.asString ?: "",
                color     = o["color"]?.asString ?: "#34d399",
                icon      = o["icon"]?.asString ?: "",
                createdAt = o["createdAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }

        root.getAsJsonArray("mapPins")?.forEach { el ->
            val o = el.asJsonObject
            mapPinDao.upsert(com.myspace.app.data.entity.MapPinEntity(
                id         = o["id"].asString,
                stackId    = o["stackId"]?.asString ?: "",
                label      = o["label"]?.asString ?: "",
                lat        = o["lat"]?.asDouble ?: 0.0,
                lng        = o["lng"]?.asDouble ?: 0.0,
                url        = o["url"]?.asString ?: "",
                note       = o["note"]?.asString ?: "",
                priority   = o["priority"]?.asString ?: "none",
                category   = o["category"]?.asString ?: "",
                rating     = o["rating"]?.asInt ?: 0,
                reviewNote = o["reviewNote"]?.asString ?: "",
                createdAt  = o["createdAt"]?.asLong ?: System.currentTimeMillis()
            ))
        }
    }
}
